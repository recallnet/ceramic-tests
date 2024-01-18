use std::path::Path;
use std::sync::Once;
use std::{env, time::Duration};

use anyhow::{anyhow, Result};
use backoff::ExponentialBackoffBuilder;
use ceramic_api_server::ApiNoContext as CeramicApi;
use ceramic_http_client::{
    api::StreamsResponse, ceramic_event::StreamId, ModelAccountRelation, ModelDefinition,
};
use ceramic_kubo_rpc_server::ApiNoContext as KuboRpcApi;
use json_patch::{Patch, PatchOperation, ReplaceOperation};
use serde_json::json;
use swagger::{
    AuthData, ContextBuilder, ContextWrapper, DropContextService, EmptyContext, Push, XSpanIdString,
};
use tokio::sync::OnceCell;
use url::Url;

use ceramic_tests_property::ceramic::{composedb_client, ComposeDbClient, SmallModel};

// Use test_log to intialize trace logging.
// For example use this to get debug logging for these tests:
//
//     RUST_LOG=info,api=debug cargo test
//
use test_log::test;

const CERAMIC_URLS: &str = "CERAMIC_URLS";
const COMPOSEDB_URLS: &str = "COMPOSEDB_URLS";
const DEFAULT_ENV_PATH: &str = "env/.env";
const ENV_PATH: &str = "ENV_PATH";

static INIT_ENV: Once = Once::new();
static COMPOSEDB_CLIENTS: OnceCell<Vec<ComposeDbClient>> = OnceCell::const_new();
static CERAMIC_CLIENTS: OnceCell<Vec<CeramicClient>> = OnceCell::const_new();
static KUBO_RPC_CLIENTS: OnceCell<Vec<KuboRpcClient>> = OnceCell::const_new();

type ClientContext = swagger::make_context_ty!(
    ContextBuilder,
    EmptyContext,
    Option<AuthData>,
    XSpanIdString
);
type CeramicClient = Box<
    ContextWrapper<
        ceramic_api_server::Client<
            DropContextService<
                hyper::client::Client<hyper::client::connect::HttpConnector>,
                ClientContext,
            >,
            ClientContext,
        >,
        ClientContext,
    >,
>;
type KuboRpcClient = Box<
    ContextWrapper<
        ceramic_kubo_rpc_server::Client<
            DropContextService<
                hyper::client::Client<hyper::client::connect::HttpConnector>,
                ClientContext,
            >,
            ClientContext,
        >,
        ClientContext,
    >,
>;

fn init_env() {
    INIT_ENV.call_once(|| {
        // Read .env
        dotenvy::from_path(Path::new(
            env::var(ENV_PATH)
                .unwrap_or(DEFAULT_ENV_PATH.to_owned())
                .as_str(),
        ))
        .expect("Could not find .env file");
    })
}

async fn get_composedb_clients() -> &'static Vec<ComposeDbClient> {
    COMPOSEDB_CLIENTS
        .get_or_init(|| async {
            init_env();
            // Parse Ceramic URLs and create clients
            let urls = env::var(COMPOSEDB_URLS).unwrap_or_default();
            let urls = urls.split(',').filter_map(|url| Url::parse(url).ok());
            let mut clients = Vec::new();
            for url in urls {
                clients.push(composedb_client(url).await);
            }
            clients
        })
        .await
}

async fn get_ceramic_clients() -> &'static Vec<CeramicClient> {
    CERAMIC_CLIENTS
        .get_or_init(|| async {
            init_env();
            // Parse Ceramic URLs and create clients
            let urls = env::var(CERAMIC_URLS).unwrap_or_default();
            let urls = urls.split(',');
            let mut clients = Vec::new();

            for url in urls {
                if url.is_empty() {
                    continue;
                }
                let context: ClientContext = swagger::make_context!(
                    ContextBuilder,
                    EmptyContext,
                    None as Option<AuthData>,
                    XSpanIdString::default()
                );
                let client = ceramic_api_server::Client::try_new_http(url)
                    .expect("Failed to create HTTP client");
                clients.push(Box::new(
                    ceramic_api_server::ContextWrapperExt::with_context(client, context),
                ))
            }

            clients
        })
        .await
}

async fn get_kubo_rpc_clients() -> &'static Vec<KuboRpcClient> {
    KUBO_RPC_CLIENTS
        .get_or_init(|| async {
            init_env();
            // Parse Ceramic URLs and create clients
            let urls = env::var(CERAMIC_URLS).unwrap_or_default();
            let urls = urls.split(',');
            let mut clients = Vec::new();

            for url in urls {
                if url.is_empty() {
                    continue;
                }
                let context: ClientContext = swagger::make_context!(
                    ContextBuilder,
                    EmptyContext,
                    None as Option<AuthData>,
                    XSpanIdString::default()
                );
                let client = ceramic_kubo_rpc_server::Client::try_new_http(url)
                    .expect("Failed to create HTTP client");
                clients.push(Box::new(
                    ceramic_kubo_rpc_server::ContextWrapperExt::with_context(client, context),
                ))
            }

            clients
        })
        .await
}

#[test(tokio::test)]
async fn composedb_hello() {
    let composedb_clients = get_composedb_clients().await;
    for (idx, client) in composedb_clients.iter().enumerate() {
        println!(
            "ComposeDB {} says {}",
            idx + 1,
            client.healthcheck().await.unwrap()
        );
    }
}

#[test(tokio::test)]
#[ignore]
async fn ceramic_hello() {
    let ceramic_clients = get_ceramic_clients().await;
    assert!(!ceramic_clients.is_empty());
    for c in ceramic_clients {
        let version = c.version_post().await.unwrap();
        println!("{version:?}");
    }
}

#[test(tokio::test)]
async fn kubo_rpc_hello() {
    let kubo_rpc_clients = get_kubo_rpc_clients().await;
    assert!(!kubo_rpc_clients.is_empty());
    for c in kubo_rpc_clients {
        let id = c.id_post(None).await.unwrap();
        println!("{id:?}");
    }
}

// Test that a model can be indexed indepenedent of where in the network that model was initially
// created.
#[test(tokio::test)]
async fn composedb_models_can_be_indexed() -> Result<()> {
    let composedb_clients = get_composedb_clients().await;
    assert!(!composedb_clients.is_empty());
    // Repeat the test where each node is the model origin.
    for origin in composedb_clients {
        // Create model on origin node
        let model = ModelDefinition::new::<SmallModel>(
            "create_and_index_model_small_model",
            ModelAccountRelation::List,
        )?;
        let model_id = origin.create_model(&model).await?;

        // Index model on all nodes
        for client in composedb_clients {
            client.index_model(&model_id).await?;
            let models = client.list_indexed_models().await?;
            assert!(models.models.contains(&model_id));
        }
    }
    Ok(())
}

// Test that updates to streams can be read on any node that is indexing an model indepenedent of
// where in the network the updates originate.
#[test(tokio::test)]
#[ignore]
async fn composedb_updates_can_be_read() -> Result<()> {
    let composedb_clients = get_composedb_clients().await;
    assert!(!composedb_clients.is_empty());
    // Prepare test by creating model indexed by all nodes.
    let origin = &composedb_clients[0];
    // Create model on origin node
    let model = ModelDefinition::new::<SmallModel>(
        "create_and_index_model_small_model",
        ModelAccountRelation::List,
    )?;
    let model_id = origin.create_model(&model).await?;

    // Index model on all nodes
    for client in composedb_clients {
        client.index_model(&model_id).await?;
    }

    let model = SmallModel::random();
    let instance_id = origin.create_list_instance(&model_id, &model).await?;

    let mut counter = model.radius;
    // Repeat the test where each node is the node accepting updates.
    for updater in composedb_clients {
        counter += 1;
        let patch = Patch(vec![PatchOperation::Replace(ReplaceOperation {
            path: "/radius".to_string(),
            value: json!(counter),
        })]);

        let resp = updater.update(&model_id, &instance_id, patch).await?;
        let update = SmallModel::try_from(resp)?;
        let has_counter_update = |model: SmallModel| model.radius == counter;
        assert!(has_counter_update(update));

        // Read update on all nodes.
        for client in composedb_clients {
            wait_on_stream_update(client, &instance_id, has_counter_update).await?;
        }
    }
    Ok(())
}

/// Polls stream state on a backoff until observe retruns true up to a maximum interval.
async fn wait_on_stream_update<M>(
    client: &ComposeDbClient,
    instance_id: &StreamId,
    observe: impl Fn(M) -> bool,
) -> Result<()>
where
    M: TryFrom<StreamsResponse, Error = anyhow::Error>,
{
    let backoff = ExponentialBackoffBuilder::new()
        .with_initial_interval(Duration::from_secs(1))
        .with_max_elapsed_time(Some(Duration::from_secs(15)))
        .build();
    backoff::future::retry(backoff, || async {
        let resp = client.get(instance_id).await?;
        let model = M::try_from(resp).map_err(backoff::Error::Permanent)?;
        if !observe(model) {
            Err(backoff::Error::Transient {
                err: anyhow!("state not yet updated"),
                retry_after: None,
            })
        } else {
            Ok(())
        }
    })
    .await?;
    Ok(())
}

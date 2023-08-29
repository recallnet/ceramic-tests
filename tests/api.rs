use std::env;
use std::path::Path;
use std::sync::Once;

use ceramic_api_server::ApiNoContext as CeramicApi;
use ceramic_kubo_rpc_server::ApiNoContext as KuboRpcApi;

use swagger::{
    AuthData, ContextBuilder, ContextWrapper, DropContextService, EmptyContext, Push, XSpanIdString,
};
use tokio::sync::OnceCell;
use tracing_test::traced_test;
use url::Url;

use rust_ceramic_migration_tests::ceramic::{composedb_client, ComposeDbClient};

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

#[tokio::test]
#[traced_test]
async fn hello_composedb() {
    let composedb_clients = get_composedb_clients().await;
    for (idx, client) in composedb_clients.iter().enumerate() {
        println!(
            "ComposeDB {} says {}",
            idx + 1,
            client.healthcheck().await.unwrap()
        );
    }
}

#[tokio::test]
#[traced_test]
async fn hello_ceramic() {
    let ceramic_clients = get_ceramic_clients().await;
    assert!(!ceramic_clients.is_empty());
    for c in ceramic_clients {
        // TODO(nathanielc): change this to a version call once https://github.com/3box/rust-ceramic/pull/83
        // merges
        let _ = c
            .subscribe_sort_key_sort_value_get(
                "model".to_string(),
                "sort_value".to_string(),
                None,
                None,
                None,
                None,
            )
            .await
            .unwrap();
    }
}

#[tokio::test]
#[traced_test]
async fn hello_kubo_rpc() {
    let kubo_rpc_clients = get_kubo_rpc_clients().await;
    assert!(!kubo_rpc_clients.is_empty());
    for c in kubo_rpc_clients {
        let id = c.id_post(None).await.unwrap();
        println!("{id:?}");
    }
}

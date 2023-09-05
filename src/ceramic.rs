use ceramic_http_client::{
    api::StreamsResponse,
    ceramic_event::{DidDocument, JwkSigner},
    remote::CeramicRemoteHttpClient,
    GetRootSchema,
};
use rand::{thread_rng, Rng};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use tracing::debug;
use url::Url;

pub type ComposeDbClient = CeramicRemoteHttpClient<JwkSigner>;

pub async fn composedb_client(url: Url) -> ComposeDbClient {
    ComposeDbClient::new(signer().await, url)
}

async fn signer() -> JwkSigner {
    let s = std::env::var("DID_DOCUMENT")
        .unwrap_or_else(|_| "did:key:z6MknX8LH956AZnat7haydYdeJTFXPwgQZypuZL4TtXUfLqw".to_owned());
    JwkSigner::new(
        DidDocument::new(&s),
        &std::env::var("DID_PRIVATE_KEY").unwrap_or_else(|_| {
            "c864a33033626b448912a19509992552283fd463c143bdc4adc75f807b7a4dce".to_owned()
        }),
    )
    .await
    .unwrap()
}

#[derive(Deserialize, JsonSchema, Serialize)]
#[schemars(rename_all = "camelCase", deny_unknown_fields)]
pub struct SmallModel {
    pub creator: String,
    pub radius: i32,
    pub red: i32,
    pub green: i32,
    pub blue: i32,
}

impl SmallModel {
    pub fn random() -> Self {
        let mut rng = thread_rng();
        Self {
            creator: "keramik".to_string(),
            radius: rng.gen_range(0..100),
            red: rng.gen_range(0..255),
            green: rng.gen_range(0..255),
            blue: rng.gen_range(0..255),
        }
    }
}

impl GetRootSchema for SmallModel {
    fn root_schema() -> schemars::schema::RootSchema {
        let settings = schemars::gen::SchemaSettings::default().with(|s| {
            s.meta_schema = Some("https://json-schema.org/draft/2020-12/schema".to_string());
            s.option_nullable = true;
            s.option_add_null_type = false;
        });
        let gen = settings.into_generator();
        let root = gen.into_root_schema_for::<Self>();
        let root_json = serde_json::to_string_pretty(&root).unwrap();
        debug!(root_json, "root schema");
        root
    }
}

impl TryFrom<StreamsResponse> for SmallModel {
    type Error = anyhow::Error;

    fn try_from(value: StreamsResponse) -> Result<Self, Self::Error> {
        if let Some(state) = value.state {
            serde_json::from_value(state.content).map_err(anyhow::Error::from)
        } else {
            Err(anyhow::anyhow!("missing state"))
        }
    }
}

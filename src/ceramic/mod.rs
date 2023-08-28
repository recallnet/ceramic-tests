use ceramic_http_client::{
    ceramic_event::{DidDocument, JwkSigner},
    remote::CeramicRemoteHttpClient,
};
use url::Url;

pub type CeramicClient = CeramicRemoteHttpClient<JwkSigner>;

pub async fn ceramic_client(url: Url) -> CeramicClient {
    CeramicClient::new(signer().await, url)
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

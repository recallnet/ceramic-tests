#[cfg(test)]
pub mod tests {
    use std::env;
    use std::path::Path;

    use tokio::sync::OnceCell;
    use tracing_test::traced_test;
    use url::Url;

    use crate::ceramic::{ceramic_client, CeramicClient};

    const CERAMIC_URLS: &str = "CERAMIC_URLS";
    const DEFAULT_ENV_PATH: &str = "env/.env";
    const ENV_PATH: &str = "ENV_PATH";

    static CLIENTS: OnceCell<Vec<CeramicClient>> = OnceCell::const_new();

    async fn get_clients() -> &'static Vec<CeramicClient> {
        CLIENTS
            .get_or_init(|| async {
                // Read .env
                dotenvy::from_path(Path::new(
                    env::var(ENV_PATH)
                        .unwrap_or(DEFAULT_ENV_PATH.to_owned())
                        .as_str(),
                ))
                .expect("Could not find .env file");
                // Parse Ceramic URLs and create clients
                let urls = env::var(CERAMIC_URLS).unwrap_or_default();
                let urls = urls.split(",").map(Url::parse);
                let mut clients = Vec::new();
                for url in urls {
                    clients.push(ceramic_client(url.unwrap()).await);
                }
                clients
            })
            .await
    }

    #[tokio::test]
    #[traced_test]
    async fn hello_ceramic() {
        let ceramic_clients = get_clients().await;
        for (idx, client) in ceramic_clients.iter().enumerate() {
            println!(
                "Ceramic {} says {}",
                idx + 1,
                client.healthcheck().await.unwrap()
            );
        }
    }
}

#[cfg(test)]
pub mod tests {
    use std::env;
    use std::path::Path;
    use std::sync::Once;

    use tokio::sync::OnceCell;
    use tracing_test::traced_test;
    use url::Url;

    use crate::ceramic::{composedb_client, ComposeDbClient};

    const CERAMIC_URLS: &str = "CERAMIC_URLS";
    const COMPOSEDB_URLS: &str = "COMPOSEDB_URLS";
    const DEFAULT_ENV_PATH: &str = "env/.env";
    const ENV_PATH: &str = "ENV_PATH";

    static INIT_ENV: Once = Once::new();
    static COMPOSEDB_CLIENTS: OnceCell<Vec<ComposeDbClient>> = OnceCell::const_new();

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
                let urls = urls.split(',').map(Url::parse);
                let mut clients = Vec::new();
                for url in urls {
                    clients.push(composedb_client(url.unwrap()).await);
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
        init_env();
        if let Ok(urls) = env::var(CERAMIC_URLS) {
            urls.split(',').for_each(|url| {
                println!("Hello Ceramic!\n{:?}", url);
            });
        }
    }
}

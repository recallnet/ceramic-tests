#[cfg(test)]
pub mod tests {
    use std::env;
    use std::path::Path;

    use rstest::{fixture, rstest};
    use tracing_test::traced_test;

    const CERAMIC_URLS: &str = "CERAMIC_URLS";
    const DEFAULT_ENV_PATH: &str = "env/.env";
    const ENV_PATH: &str = "ENV_PATH";

    #[fixture]
    #[once]
    fn initialize() {
        dotenvy::from_path(Path::new(
            env::var(ENV_PATH)
                .unwrap_or(DEFAULT_ENV_PATH.to_owned())
                .as_str(),
        ))
        .expect("Could not find .env file");
    }

    fn print_ceramic_urls() {
        println!("{:?}", env::var(CERAMIC_URLS).unwrap_or_default());
    }

    #[rstest]
    #[traced_test]
    fn test_1(_initialize: ()) {
        println!("Hello Ceramic!");
        print_ceramic_urls();
    }

    #[rstest]
    #[traced_test]
    fn test_2(_initialize: ()) {
        println!("Goodbye Ceramic!");
        print_ceramic_urls();
    }
}

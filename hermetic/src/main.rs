use anyhow::Result;
use ceramic_tests_hermetic_driver::cli;
use clap::Parser;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    env_logger::init();

    let args = cli::Cli::parse();
    match args.command {
        cli::Command::Test(opts) => cli::tester::run(opts).await,
    }
}

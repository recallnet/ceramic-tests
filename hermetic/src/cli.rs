use std::{fmt::Display, path::PathBuf};

use clap::{builder::PossibleValue, Args, Parser, Subcommand, ValueEnum};
pub mod tester;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Run a daemon process
    Test(TestOpts),
}

#[derive(Args, Debug, Clone)]
pub struct TestOpts {
    /// Path to network yaml file
    #[arg(short, long)]
    network: PathBuf,

    /// Name and label of the specific test image to use.
    /// Defaults to latest published image.
    /// Setting this value implies an image pull policy of IfNotPresent
    #[arg(short, long)]
    test_image: Option<String>,

    /// Type of tests to run.
    #[arg(short, long)]
    flavor: Flavor,

    /// Optional suffix to apply to network name.
    /// Used to create unique networks.
    #[arg(short, long)]
    suffix: Option<String>,

    /// Number of seconds after which the network should get cleaned up.
    #[arg(long, default_value_t = 8 * 60 * 60)]
    network_ttl: u64,

    /// Number of seconds to wait for network to become ready.
    #[arg(long, default_value_t = 600)]
    network_timeout: u32,

    /// Number of seconds to wait for the test job to finish.
    #[arg(long, default_value_t = 300)]
    job_timeout: u32,

    /// Path regex passed to Jest to select which tests to run.
    #[arg(long, default_value = ".")]
    test_selector: String,
}

#[derive(Debug, Clone)]
pub enum Flavor {
    /// Property based tests
    Property,
    /// Smoke tests
    Smoke,
}

impl Flavor {
    fn name(&self) -> &'static str {
        match self {
            Flavor::Property => "prop",
            Flavor::Smoke => "smoke",
        }
    }
}

impl ValueEnum for Flavor {
    fn value_variants<'a>() -> &'a [Self] {
        &[Flavor::Property, Flavor::Smoke]
    }

    fn to_possible_value(&self) -> Option<clap::builder::PossibleValue> {
        Some(PossibleValue::new(self.name()))
    }
}

impl Display for Flavor {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

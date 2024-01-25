use std::{fmt::Display, path::PathBuf};

use anyhow::anyhow;
use clap::{builder::PossibleValue, Args, Parser, Subcommand, ValueEnum};

use self::tester::{Flavor, TestConfig};

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

    /// Path to simulation yaml file
    #[arg(long)]
    simulation: Option<PathBuf>,

    /// Name and label of the specific test image to use.
    /// Defaults to latest published image.
    /// Setting this value implies an image pull policy of IfNotPresent
    #[arg(short, long)]
    test_image: Option<String>,

    /// Type of tests to run.
    #[arg(short, long)]
    flavor: FlavorOpts,

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
    #[arg(long, default_value_t = 60 * 60 * 3)]
    job_timeout: u32,

    /// Path regex passed to Jest to select which tests to run.
    #[arg(long, default_value = ".")]
    test_selector: String,
}

#[derive(Debug, Clone)]
pub enum FlavorOpts {
    /// Property based tests
    Property,
    /// Smoke tests
    Smoke,
    /// Performance tests
    Performance,
}

impl FlavorOpts {
    fn name(&self) -> &'static str {
        match self {
            FlavorOpts::Property => "prop",
            FlavorOpts::Smoke => "smoke",
            FlavorOpts::Performance => "perf",
        }
    }
}

impl ValueEnum for FlavorOpts {
    fn value_variants<'a>() -> &'a [Self] {
        &[
            FlavorOpts::Property,
            FlavorOpts::Smoke,
            FlavorOpts::Performance,
        ]
    }

    fn to_possible_value(&self) -> Option<clap::builder::PossibleValue> {
        Some(PossibleValue::new(self.name()))
    }
}

impl Display for FlavorOpts {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

impl TryFrom<TestOpts> for TestConfig {
    type Error = anyhow::Error;

    fn try_from(opts: TestOpts) -> Result<Self, Self::Error> {
        let TestOpts {
            network,
            simulation,
            test_image,
            flavor,
            suffix,
            network_ttl,
            network_timeout,
            job_timeout,
            test_selector,
        } = opts;

        let flavor = match flavor {
            FlavorOpts::Property => Flavor::Property,
            FlavorOpts::Smoke => Flavor::Smoke,
            FlavorOpts::Performance => Flavor::Performance(
                simulation.ok_or(anyhow!("Simulation file required for performance tests"))?,
            ),
        };

        Ok(TestConfig {
            network,
            test_image,
            flavor,
            suffix,
            network_ttl,
            network_timeout,
            job_timeout,
            test_selector,
        })
    }
}

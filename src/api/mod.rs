#[cfg(test)]
pub mod tests {
    use tracing_test::traced_test;

    #[test]
    #[traced_test]
    fn test_1() {
        println!("Hello world!");
    }

    #[test]
    #[traced_test]
    fn test_2() {
        println!("Goodbye world!");
    }
}

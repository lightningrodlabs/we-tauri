use clap::Parser;

fn main() {
    if std::env::var_os("RUST_LOG").is_some() {
        observability::init_fmt(observability::Output::Log).ok();
    }
    let ops = we_test_applets::cli::WeTestApplets::parse();
    if let Err(err) = ops.run() {
        println!("Error running we-test-applet: {:?}", err);
    }
}

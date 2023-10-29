use clap::Parser;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    if std::env::var_os("RUST_LOG").is_some() {
        observability::init_fmt(observability::Output::Log).ok();
    }
    let ops = we_test_applet::cli::WeTestApplet::parse();
    ops.run().await?;

    Ok(())
}

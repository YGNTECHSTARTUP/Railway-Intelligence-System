fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configure tonic-build for protobuf generation
    tonic_build::configure()
        .build_server(false) // We're only building the client
        .build_client(true)
        .compile(
            &["proto/optimization.proto"],
            &["proto/"],
        )?;
    
    // Tell cargo to rerun if proto files change
    println!("cargo:rerun-if-changed=proto/optimization.proto");
    println!("cargo:rerun-if-changed=proto/");
    println!("cargo:rerun-if-changed=build.rs");
    
    Ok(())
}

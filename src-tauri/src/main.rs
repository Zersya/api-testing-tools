#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    mock_service_lib::run()
}

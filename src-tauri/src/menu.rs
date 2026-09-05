use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Wry,
};

pub fn create_app_menu(app: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    // 1. File Menu
    let new_item = MenuItem::with_id(app, "file_new", "New Project", true, Some("CmdOrCtrl+N"))?;
    let open_item = MenuItem::with_id(app, "file_open", "Open Project...", true, Some("CmdOrCtrl+O"))?;
    let save_item = MenuItem::with_id(app, "file_save", "Save Project", true, Some("CmdOrCtrl+S"))?;
    let save_as_item = MenuItem::with_id(app, "file_save_as", "Save Project As...", true, Some("CmdOrCtrl+Shift+S"))?;
    let export_comtrade = MenuItem::with_id(app, "file_export_comtrade", "Export COMTRADE...", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let quit_item = PredefinedMenuItem::quit(app, Some("Exit PSCAD Modern"))?;

    let file_submenu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_item,
            &open_item,
            &save_item,
            &save_as_item,
            &sep1,
            &export_comtrade,
            &quit_item,
        ],
    )?;

    // 2. Edit Menu
    let undo_item = MenuItem::with_id(app, "edit_undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
    let redo_item = MenuItem::with_id(app, "edit_redo", "Redo", true, Some("CmdOrCtrl+Y"))?;
    let cut_item = MenuItem::with_id(app, "edit_cut", "Cut", true, Some("CmdOrCtrl+X"))?;
    let copy_item = MenuItem::with_id(app, "edit_copy", "Copy", true, Some("CmdOrCtrl+C"))?;
    let paste_item = MenuItem::with_id(app, "edit_paste", "Paste", true, Some("CmdOrCtrl+V"))?;
    let select_all = MenuItem::with_id(app, "edit_select_all", "Select All", true, Some("CmdOrCtrl+A"))?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let edit_submenu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &undo_item,
            &redo_item,
            &sep2,
            &cut_item,
            &copy_item,
            &paste_item,
            &select_all,
        ],
    )?;

    // 3. View Menu
    let zoom_in = MenuItem::with_id(app, "view_zoom_in", "Zoom In", true, Some("CmdOrCtrl+="))?;
    let zoom_out = MenuItem::with_id(app, "view_zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
    let zoom_fit = MenuItem::with_id(app, "view_zoom_fit", "Zoom to Fit", true, Some("CmdOrCtrl+0"))?;
    let toggle_grid = MenuItem::with_id(app, "view_toggle_grid", "Toggle Grid", true, Some("CmdOrCtrl+G"))?;

    let view_submenu = Submenu::with_items(
        app,
        "View",
        true,
        &[&zoom_in, &zoom_out, &zoom_fit, &toggle_grid],
    )?;

    // 4. Simulation Menu
    let run_sim = MenuItem::with_id(app, "sim_run", "Run Simulation", true, Some("F5"))?;
    let pause_sim = MenuItem::with_id(app, "sim_pause", "Pause Simulation", true, Some("F6"))?;
    let stop_sim = MenuItem::with_id(app, "sim_stop", "Stop & Reset", true, Some("Shift+F5"))?;
    let step_sim = MenuItem::with_id(app, "sim_step", "Step Single Cycle", true, Some("F8"))?;
    let sep3 = PredefinedMenuItem::separator(app)?;
    let snapshot_item = MenuItem::with_id(app, "sim_snapshot", "Snapshots & Hot-Start...", true, Some("F9"))?;

    let sim_submenu = Submenu::with_items(
        app,
        "Simulation",
        true,
        &[&run_sim, &pause_sim, &stop_sim, &step_sim, &sep3, &snapshot_item],
    )?;

    // 5. Tools Menu
    let comp_builder = MenuItem::with_id(app, "tools_builder", "Custom Component Workshop...", true, None::<&str>)?;
    let lcp_studio = MenuItem::with_id(app, "tools_lcp", "Line Constants (LCP) Studio...", true, None::<&str>)?;
    let freq_scan = MenuItem::with_id(app, "tools_freq_scan", "Harmonic Impedance Scan Z(f)...", true, None::<&str>)?;
    let comtrade_mgr = MenuItem::with_id(app, "tools_comtrade", "COMTRADE File Manager...", true, None::<&str>)?;
    let multi_run = MenuItem::with_id(app, "tools_multirun", "Automated Parametric Multi-Run...", true, None::<&str>)?;

    let tools_submenu = Submenu::with_items(
        app,
        "Tools",
        true,
        &[&comp_builder, &lcp_studio, &freq_scan, &comtrade_mgr, &multi_run],
    )?;

    // 6. Help Menu
    let shortcuts_item = MenuItem::with_id(app, "help_shortcuts", "Keyboard Shortcuts", true, Some("F1"))?;
    let about_item = MenuItem::with_id(app, "help_about", "About PSCAD Modern", true, None::<&str>)?;

    let help_submenu = Submenu::with_items(app, "Help", true, &[&shortcuts_item, &about_item])?;

    Menu::with_items(
        app,
        &[
            &file_submenu,
            &edit_submenu,
            &view_submenu,
            &sim_submenu,
            &tools_submenu,
            &help_submenu,
        ],
    )
}

use ratatui::prelude::*;

#[derive(Debug, Clone)]
pub struct Theme {
    pub name: String,
    // Background colors
    pub background: Color,
    pub background_panel: Color,
    pub background_element: Color,
    // Text colors
    pub text: Color,
    pub text_muted: Color,
    // Accent colors
    pub primary: Color,
    pub secondary: Color,
    pub accent: Color,
    // Status colors
    pub error: Color,
    pub warning: Color,
    pub success: Color,
    pub info: Color,
    // Border colors
    pub border: Color,
    pub border_active: Color,
    pub border_subtle: Color,
    // Diff colors
    pub diff_added: Color,
    pub diff_removed: Color,
    pub diff_context: Color,
    pub diff_hunk_header: Color,
}

impl Theme {
    pub fn dark() -> Self {
        Theme {
            name: "Dark".to_string(),
            // OpenCode dark theme colors
            background: Color::Rgb(10, 10, 10),        // #0a0a0a
            background_panel: Color::Rgb(20, 20, 20),   // #141414
            background_element: Color::Rgb(30, 30, 30), // #1e1e1e
            text: Color::Rgb(238, 238, 238),            // #eeeeee
            text_muted: Color::Rgb(128, 128, 128),      // #808080
            primary: Color::Rgb(250, 178, 131),         // #fab283 (orange)
            secondary: Color::Rgb(92, 156, 245),        // #5c9cf5 (blue)
            accent: Color::Rgb(157, 124, 216),          // #9d7cd8 (purple)
            error: Color::Rgb(224, 108, 117),           // #e06c75 (red)
            warning: Color::Rgb(245, 167, 66),          // #f5a742 (orange)
            success: Color::Rgb(127, 216, 143),         // #7fd88f (green)
            info: Color::Rgb(86, 182, 194),             // #56b6c2 (cyan)
            border: Color::Rgb(72, 72, 72),             // #484848
            border_active: Color::Rgb(96, 96, 96),      // #606060
            border_subtle: Color::Rgb(40, 40, 40),      // #282828
            diff_added: Color::Rgb(127, 216, 143),      // #7fd88f
            diff_removed: Color::Rgb(224, 108, 117),    // #e06c75
            diff_context: Color::Rgb(128, 128, 128),    // #808080
            diff_hunk_header: Color::Rgb(157, 124, 216), // #9d7cd8
        }
    }

    pub fn light() -> Self {
        Theme {
            name: "Light".to_string(),
            background: Color::Rgb(255, 255, 255),      // #ffffff
            background_panel: Color::Rgb(245, 245, 245), // #f5f5f5
            background_element: Color::Rgb(235, 235, 235), // #ebebeb
            text: Color::Rgb(26, 27, 38),               // #1a1b26
            text_muted: Color::Rgb(128, 128, 128),      // #808080
            primary: Color::Rgb(180, 100, 50),          // B46432
            secondary: Color::Rgb(50, 100, 180),        // #3264b4
            accent: Color::Rgb(100, 70, 160),           // #6446a0
            error: Color::Rgb(200, 60, 70),             // #c83c46
            warning: Color::Rgb(200, 130, 40),          // #c88228
            success: Color::Rgb(60, 160, 70),           // #3ca046
            info: Color::Rgb(50, 140, 160),             // #328ca0
            border: Color::Rgb(200, 200, 200),          // #c8c8c8
            border_active: Color::Rgb(160, 160, 160),   // #a0a0a0
            border_subtle: Color::Rgb(220, 220, 220),   // #dcdcdc
            diff_added: Color::Rgb(60, 160, 70),
            diff_removed: Color::Rgb(200, 60, 70),
            diff_context: Color::Rgb(128, 128, 128),
            diff_hunk_header: Color::Rgb(100, 70, 160),
        }
    }

    pub fn ocean() -> Self {
        Theme {
            name: "Ocean".to_string(),
            background: Color::Rgb(13, 17, 23),
            background_panel: Color::Rgb(22, 27, 34),
            background_element: Color::Rgb(33, 38, 45),
            text: Color::Rgb(201, 209, 217),
            text_muted: Color::Rgb(110, 118, 129),
            primary: Color::Rgb(88, 166, 255),
            secondary: Color::Rgb(121, 192, 255),
            accent: Color::Rgb(187, 134, 252),
            error: Color::Rgb(248, 81, 73),
            warning: Color::Rgb(229, 192, 123),
            success: Color::Rgb(63, 185, 80),
            info: Color::Rgb(56, 139, 253),
            border: Color::Rgb(48, 54, 61),
            border_active: Color::Rgb(88, 96, 105),
            border_subtle: Color::Rgb(33, 38, 45),
            diff_added: Color::Rgb(63, 185, 80),
            diff_removed: Color::Rgb(248, 81, 73),
            diff_context: Color::Rgb(110, 118, 129),
            diff_hunk_header: Color::Rgb(187, 134, 252),
        }
    }

    pub fn dracula() -> Self {
        Theme {
            name: "Dracula".to_string(),
            background: Color::Rgb(40, 42, 54),
            background_panel: Color::Rgb(68, 71, 90),
            background_element: Color::Rgb(98, 114, 164),
            text: Color::Rgb(248, 248, 242),
            text_muted: Color::Rgb(98, 114, 164),
            primary: Color::Rgb(255, 121, 198),
            secondary: Color::Rgb(139, 233, 253),
            accent: Color::Rgb(189, 147, 249),
            error: Color::Rgb(255, 85, 85),
            warning: Color::Rgb(241, 250, 140),
            success: Color::Rgb(80, 250, 123),
            info: Color::Rgb(139, 233, 253),
            border: Color::Rgb(98, 114, 164),
            border_active: Color::Rgb(68, 71, 90),
            border_subtle: Color::Rgb(50, 52, 65),
            diff_added: Color::Rgb(80, 250, 123),
            diff_removed: Color::Rgb(255, 85, 85),
            diff_context: Color::Rgb(98, 114, 164),
            diff_hunk_header: Color::Rgb(189, 147, 249),
        }
    }

    pub fn tokyonight() -> Self {
        Theme {
            name: "TokyoNight".to_string(),
            background: Color::Rgb(26, 27, 38),
            background_panel: Color::Rgb(36, 40, 59),
            background_element: Color::Rgb(56, 60, 79),
            text: Color::Rgb(192, 202, 245),
            text_muted: Color::Rgb(137, 144, 178),
            primary: Color::Rgb(187, 154, 247),
            secondary: Color::Rgb(125, 207, 255),
            accent: Color::Rgb(122, 162, 247),
            error: Color::Rgb(247, 118, 142),
            warning: Color::Rgb(224, 175, 104),
            success: Color::Rgb(158, 206, 106),
            info: Color::Rgb(125, 207, 255),
            border: Color::Rgb(59, 66, 97),
            border_active: Color::Rgb(86, 95, 137),
            border_subtle: Color::Rgb(40, 44, 63),
            diff_added: Color::Rgb(158, 206, 106),
            diff_removed: Color::Rgb(247, 118, 142),
            diff_context: Color::Rgb(137, 144, 178),
            diff_hunk_header: Color::Rgb(187, 154, 247),
        }
    }

    pub fn presets() -> Vec<Self> {
        vec![
            Self::dark(),
            Self::light(),
            Self::ocean(),
            Self::dracula(),
            Self::tokyonight(),
        ]
    }

    // Legacy compatibility methods
    pub fn fg(&self) -> Color {
        self.text
    }

    pub fn bg(&self) -> Color {
        self.background
    }

    pub fn highlight(&self) -> Color {
        self.primary
    }

    pub fn dim(&self) -> Color {
        self.text_muted
    }

    pub fn get_style(&self, fg: Option<Color>) -> Style {
        match fg {
            Some(color) => Style::default().fg(color),
            None => Style::default().fg(self.text),
        }
    }

    pub fn get_block_style(&self, border_color: Option<Color>) -> Style {
        Style::default().fg(border_color.unwrap_or(self.border))
    }
}

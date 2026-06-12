use ratatui::prelude::*;

#[derive(Debug, Clone)]
pub struct Theme {
    pub name: String,
    pub bg: Color,
    pub fg: Color,
    pub accent: Color,
    pub border: Color,
    pub highlight: Color,
    pub dim: Color,
    pub error: Color,
    pub success: Color,
}

impl Theme {
    pub fn dark() -> Self {
        Theme {
            name: "Dark".to_string(),
            bg: Color::Rgb(26, 27, 38),
            fg: Color::Rgb(192, 202, 245),
            accent: Color::Rgb(122, 162, 247),
            border: Color::Rgb(97, 175, 239),
            highlight: Color::Rgb(255, 255, 255),
            dim: Color::Rgb(100, 110, 140),
            error: Color::Rgb(255, 85, 85),
            success: Color::Rgb(85, 255, 85),
        }
    }

    pub fn light() -> Self {
        Theme {
            name: "Light".to_string(),
            bg: Color::Rgb(245, 245, 245),
            fg: Color::Rgb(26, 27, 38),
            accent: Color::Rgb(46, 125, 233),
            border: Color::Rgb(100, 120, 160),
            highlight: Color::Rgb(0, 0, 0),
            dim: Color::Rgb(150, 150, 150),
            error: Color::Rgb(220, 53, 69),
            success: Color::Rgb(40, 167, 69),
        }
    }

    pub fn ocean() -> Self {
        Theme {
            name: "Ocean".to_string(),
            bg: Color::Rgb(13, 17, 23),
            fg: Color::Rgb(201, 209, 217),
            accent: Color::Rgb(88, 166, 255),
            border: Color::Rgb(56, 139, 253),
            highlight: Color::Rgb(255, 255, 255),
            dim: Color::Rgb(110, 130, 150),
            error: Color::Rgb(248, 81, 73),
            success: Color::Rgb(46, 204, 113),
        }
    }

    pub fn forest() -> Self {
        Theme {
            name: "Forest".to_string(),
            bg: Color::Rgb(26, 47, 26),
            fg: Color::Rgb(184, 212, 184),
            accent: Color::Rgb(123, 196, 127),
            border: Color::Rgb(90, 170, 90),
            highlight: Color::Rgb(255, 255, 255),
            dim: Color::Rgb(120, 150, 120),
            error: Color::Rgb(255, 107, 107),
            success: Color::Rgb(85, 225, 85),
        }
    }

    pub fn presets() -> Vec<Self> {
        vec![
            Self::dark(),
            Self::light(),
            Self::ocean(),
            Self::forest(),
        ]
    }

    pub fn get_style(&self, fg: Option<Color>) -> Style {
        match fg {
            Some(color) => Style::default().fg(color),
            None => Style::default().fg(self.fg),
        }
    }

    pub fn get_block_style(&self, border_color: Option<Color>) -> Style {
        Style::default().fg(border_color.unwrap_or(self.border))
    }
}

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("pymobiledevice3 未安装，请运行: pipx install pymobiledevice3")]
    NotInstalled,

    #[error("截图失败: {0}")]
    ScreenshotFailed(String),

    #[error("IO 错误: {0}")]
    IoError(#[from] std::io::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type AppResult<T> = Result<T, AppError>;
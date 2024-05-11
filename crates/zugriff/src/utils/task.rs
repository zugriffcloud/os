use std::ops::{Deref, DerefMut};
use std::pin::Pin;
use std::task::{Context, Poll};

use tokio::task::{JoinError, JoinHandle};

pub struct Pure<T> {
  join_handle: JoinHandle<T>,
}

impl<T> Pure<T> {
  pub fn new(join_handle: JoinHandle<T>) -> Self {
    Self { join_handle }
  }
}

impl<T> Deref for Pure<T> {
  type Target = JoinHandle<T>;

  fn deref(&self) -> &Self::Target {
    &self.join_handle
  }
}

impl<T> DerefMut for Pure<T> {
  fn deref_mut(&mut self) -> &mut Self::Target {
    &mut self.join_handle
  }
}

impl<T> Drop for Pure<T> {
  fn drop(&mut self) {
    if !self.join_handle.is_finished() {
      self.join_handle.abort()
    }
  }
}

impl<T> futures::future::Future for Pure<T> {
  type Output = Result<T, JoinError>;

  fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
    Pin::new(&mut self.get_mut().join_handle).poll(cx)
  }
}

pub fn redact(value: String) -> String {
  let suffix = value.chars().last();

  let mut value = value
    .chars()
    .into_iter()
    .take((value.len() / 3).min(5))
    .collect::<Vec<char>>();
  value.append(&mut vec!['•'; 3]);

  if let Some(suffix) = suffix {
    value.push(suffix);
  }

  value.into_iter().collect()
}

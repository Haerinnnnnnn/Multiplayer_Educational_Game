export function calculateAge(birthday, today = new Date()) {
  if (!birthday) return null;

  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;
  return age;
}

export function getLatestBirthdayForAge(minimumAge, today = new Date()) {
  const latestBirthday = new Date(today.getFullYear() - minimumAge, today.getMonth(), today.getDate());
  return [
    latestBirthday.getFullYear(),
    String(latestBirthday.getMonth() + 1).padStart(2, '0'),
    String(latestBirthday.getDate()).padStart(2, '0'),
  ].join('-');
}

export function validateMinimumAge(birthday, minimumAge, roleLabel) {
  const age = calculateAge(birthday);

  if (age === null) {
    return 'Please enter a valid birthday.';
  }

  if (age < minimumAge) {
    return `${roleLabel} must be at least ${minimumAge} years old to register.`;
  }

  return '';
}

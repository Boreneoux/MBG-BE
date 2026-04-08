import bcrypt from 'bcrypt';

export async function hashing(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function hashMatch(plainPassword: string, hashedPassword: string) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

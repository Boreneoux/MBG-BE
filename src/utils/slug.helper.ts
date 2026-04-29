import slugify from 'slugify';

export async function generateUniqueSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let counter = 2;

  while (await checkExists(slug)) {
    slug = `${base}-${counter++}`;
  }

  return slug;
}

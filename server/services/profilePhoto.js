export function validateAvatar(value) {
  if (value === undefined) return;
  if (typeof value !== 'string' || value.length > 500000 || (value && !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))) {
    throw new Error('Choose a valid JPG, PNG or WebP profile photo.');
  }
}

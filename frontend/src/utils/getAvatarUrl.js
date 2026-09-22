export const getAvatarUrl = (profileImage, defaultSeed = 'User') => {
  if (!profileImage) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${defaultSeed}`;
  if (profileImage.startsWith('blob:')) return profileImage;
  if (profileImage.startsWith('/uploads')) return `http://${window.location.hostname}:5000${profileImage}`;
  return profileImage;
};

// src/utils/CategoryImages.ts

/**
 * Drop your transparent category doodle images into `src/assets/images/categories/`.
 * Ensure they are named correctly (e.g. food.png, transport.png, etc.)
 */
export const getCategoryDoodle = (categoryName: string) => {
  switch (categoryName) {
    case 'Food':
      // return require('../assets/images/categories/food.png');
      return require('../assets/images/doodles/food.png'); // Fallback to our generated one for now
    case 'Transport':
      // return require('../assets/images/categories/transport.png');
      return require('../assets/images/doodles/transport.png');
    case 'Housing & Utilities':
      // return require('../assets/images/categories/housing.png');
      return require('../assets/images/doodles/housing.png');
    case 'Shopping':
      // return require('../assets/images/categories/shopping.png');
      return require('../assets/images/doodles/food.png'); // Placeholder
    case 'Entertainment':
      // return require('../assets/images/categories/entertainment.png');
      return require('../assets/images/doodles/food.png'); // Placeholder
    default:
      // return require('../assets/images/categories/default.png');
      return require('../assets/images/doodles/food.png'); // Placeholder
  }
};

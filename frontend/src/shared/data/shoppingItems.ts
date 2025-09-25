export interface LocalizedShoppingItem {
  en: string
  ru: string
}

export const defaultShoppingItems: LocalizedShoppingItem[] = [
  // Dairy & Eggs
  { en: 'Milk', ru: 'Молоко' },
  { en: 'Eggs', ru: 'Яйца' },
  { en: 'Butter', ru: 'Масло сливочное' },
  { en: 'Cheese', ru: 'Сыр' },
  { en: 'Yogurt', ru: 'Йогурт' },
  { en: 'Cream', ru: 'Сливки' },
  { en: 'Cottage cheese', ru: 'Творог' },
  { en: 'Sour cream', ru: 'Сметана' },

  // Meat & Poultry
  { en: 'Chicken', ru: 'Курица' },
  { en: 'Beef', ru: 'Говядина' },
  { en: 'Pork', ru: 'Свинина' },
  { en: 'Fish', ru: 'Рыба' },
  { en: 'Salmon', ru: 'Лосось' },
  { en: 'Turkey', ru: 'Индейка' },
  { en: 'Ham', ru: 'Ветчина' },
  { en: 'Bacon', ru: 'Бекон' },

  // Fruits
  { en: 'Apples', ru: 'Яблоки' },
  { en: 'Bananas', ru: 'Бананы' },
  { en: 'Oranges', ru: 'Апельсины' },
  { en: 'Grapes', ru: 'Виноград' },
  { en: 'Strawberries', ru: 'Клубника' },
  { en: 'Lemons', ru: 'Лимоны' },
  { en: 'Avocado', ru: 'Авокадо' },
  { en: 'Pears', ru: 'Груши' },

  // Vegetables
  { en: 'Tomatoes', ru: 'Помидоры' },
  { en: 'Potatoes', ru: 'Картофель' },
  { en: 'Onions', ru: 'Лук' },
  { en: 'Carrots', ru: 'Морковь' },
  { en: 'Cucumbers', ru: 'Огурцы' },
  { en: 'Bell peppers', ru: 'Болгарский перец' },
  { en: 'Broccoli', ru: 'Брокколи' },
  { en: 'Spinach', ru: 'Шпинат' },
  { en: 'Garlic', ru: 'Чеснок' },
  { en: 'Cabbage', ru: 'Капуста' },

  // Bread & Bakery
  { en: 'Bread', ru: 'Хлеб' },
  { en: 'Baguette', ru: 'Багет' },
  { en: 'Croissants', ru: 'Круассаны' },
  { en: 'Muffins', ru: 'Кексы' },

  // Pantry Items
  { en: 'Rice', ru: 'Рис' },
  { en: 'Pasta', ru: 'Макароны' },
  { en: 'Flour', ru: 'Мука' },
  { en: 'Sugar', ru: 'Сахар' },
  { en: 'Salt', ru: 'Соль' },
  { en: 'Oil', ru: 'Растительное масло' },
  { en: 'Vinegar', ru: 'Уксус' },
  { en: 'Honey', ru: 'Мёд' },

  // Beverages
  { en: 'Water', ru: 'Вода' },
  { en: 'Coffee', ru: 'Кофе' },
  { en: 'Tea', ru: 'Чай' },
  { en: 'Juice', ru: 'Сок' },
  { en: 'Beer', ru: 'Пиво' },
  { en: 'Wine', ru: 'Вино' },

  // Frozen Foods
  { en: 'Ice cream', ru: 'Мороженое' },
  { en: 'Frozen vegetables', ru: 'Замороженные овощи' },
  { en: 'Frozen berries', ru: 'Замороженные ягоды' },

  // Snacks
  { en: 'Chips', ru: 'Чипсы' },
  { en: 'Cookies', ru: 'Печенье' },
  { en: 'Nuts', ru: 'Орехи' },
  { en: 'Chocolate', ru: 'Шоколад' },

  // Household
  { en: 'Toilet paper', ru: 'Туалетная бумага' },
  { en: 'Soap', ru: 'Мыло' },
  { en: 'Shampoo', ru: 'Шампунь' },
  { en: 'Toothpaste', ru: 'Зубная паста' },
  { en: 'Detergent', ru: 'Стиральный порошок' },
  { en: 'Paper towels', ru: 'Бумажные полотенца' },
]

export const getShoppingItemsByLanguage = (language: 'en' | 'ru' = 'en'): string[] => {
  return defaultShoppingItems.map((item) => item[language])
}

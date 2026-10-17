// All business details are illustrative. Replace and approve before publication.
export const content = {
  brand: 'Rosewood Gardens',
  motto: 'In Touch with Nature.',
  currency: 'USD',
  origin: 'It begins with a simple idea: the best moments happen when we slow down. Imagined around a love of gardens, good food and thoughtful hospitality, Rosewood is a place to gather, celebrate and feel a little closer to nature.',
  originNote: 'A draft story for a place with a story of its own. Replace with the owner’s history.',
  venue: { capacity: 120, occasions: ['Garden weddings', 'Private celebrations', 'Team retreats', 'Intimate gatherings'] },
  facilities: [
    { name: 'The garden lawn', label: 'GATHER UNDER OPEN SKIES', image: 'garden', description: 'A green canvas for ceremonies, leisurely afternoons and beautiful celebrations. Sample capacity: up to 120 guests.' },
    { name: 'The covered pavilion', label: 'A LITTLE SHELTER, A LOT OF CHARM', image: 'venue', description: 'An airy setting for dining and conversation, with a covered layout imagined for smaller events. Sample capacity: 60 seated.' },
    { name: 'The dining terrace', label: 'TIME TO SAVOUR', image: 'terrace', description: 'An inviting place for seasonal plates, a slow breakfast or a table shared with friends. Sample capacity: 32 seated.' },
    { name: 'The quiet corners', label: 'ROOM TO EXHALE', image: 'flowers', description: 'Shaded garden seating and tucked-away spots for reading, reflection and unhurried conversation.' }
  ],
  menu: [
    { id: 'salad', name: 'Garden harvest salad', category: 'From the garden', price: 14, image: 'food', description: 'Seasonal greens, roasted vegetables, citrus dressing.', tag: 'Plant-based' },
    { id: 'soup', name: 'Roasted tomato soup', category: 'From the garden', price: 10, image: 'food', description: 'Slow-roasted tomatoes, basil and toasted sourdough.', tag: 'Vegetarian' },
    { id: 'chicken', name: 'Rosemary roast chicken', category: 'At the table', price: 24, image: 'terrace', description: 'Herb-roasted chicken, garden vegetables and pan jus.', tag: 'House favourite' },
    { id: 'pasta', name: 'Wild mushroom pasta', category: 'At the table', price: 20, image: 'food', description: 'Creamy mushrooms, fresh herbs and parmesan.', tag: 'Vegetarian' },
    { id: 'dessert', name: 'Berry & vanilla parfait', category: 'Something sweet', price: 9, image: 'dessert', description: 'Vanilla cream, seasonal berries and a delicate crumble.', tag: 'Seasonal' },
    { id: 'tea', name: 'Garden tea service', category: 'To sip', price: 6, image: 'flowers', description: 'A pot of herbal tea, served with honey on the side.', tag: 'Slow moments' }
  ],
  rooms: [
    { id: 'garden', name: 'Garden Room', subtitle: 'A peaceful place to begin and end the day.', image: 'room', single: 85, double: 115, bed: 'One queen bed', details: 'Garden outlook · Private bathroom · Reading corner' },
    { id: 'terrace', name: 'Terrace Suite', subtitle: 'A little more space. A little longer to linger.', image: 'room', single: 125, double: 155, bed: 'One king bed', details: 'Private terrace · Sitting area · Private bathroom' }
  ],
  meals: { breakfast: 12, lunch: 18, dinner: 25 },
  team: [
    { name: 'Alex Morgan', role: 'Your host', initials: 'AM', description: 'A warm welcome, thoughtful details and a love of bringing people together.' },
    { name: 'Jamie Ellis', role: 'Head of the kitchen', initials: 'JE', description: 'Seasonal ingredients and generous plates, made for moments worth sharing.' },
    { name: 'Sam Rivers', role: 'Garden & grounds', initials: 'SR', description: 'Caring for the green spaces that make every visit feel a little slower.' }
  ],
  gallery: [
    { image: 'garden', title: 'A path to somewhere peaceful', category: 'Gardens' },
    { image: 'venue', title: 'A setting for your story', category: 'Celebrations' },
    { image: 'food', title: 'Fresh from the kitchen', category: 'Dining' },
    { image: 'flowers', title: 'Nature in the details', category: 'Gardens' },
    { image: 'room', title: 'Stay a little longer', category: 'Rooms' },
    { image: 'terrace', title: 'Gather around the table', category: 'Dining' },
    { image: 'dessert', title: 'The sweetest ending', category: 'Dining' }
  ]
};

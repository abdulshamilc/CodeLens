// src/tools/dbv/examples/prototypes.js
// Category: Prototypes and Classes

export const PROTOTYPES_EXAMPLES = [
  {
    id: "prototype-constructor-function",
    title: "Constructor function with methods",
    category: "Prototypes",
    level: "beginner",
    description: "Constructors invoked with new produce objects endowed with methods.",
    whatToWatch: [
      "new Animal('Dog') initializes instance name",
      "speak() method reads this.name from instance",
    ],
    code: `// Constructor function instance methods
function Animal(name) {
  this.name = name;
  this.speak = function() {
    return this.name + " makes a sound";
  };
}

const dog = new Animal("Dog");
console.log(dog.speak());
`,
    expectedOutput: ['"Dog makes a sound"'],
    focus: "heap",
    breakpoints: [3, 9],
    tags: ["prototypes", "constructor", "new", "start-here"],
  },
  {
    id: "prototype-class-syntax",
    title: "ES6 Class syntax with constructor and methods",
    category: "Prototypes",
    level: "intermediate",
    description: "ES6 classes offer clean syntax over JavaScript prototype-based inheritance.",
    whatToWatch: [
      "Class constructor allocates fields on instance",
      "getArea method is invoked with this bound to rect instance",
    ],
    code: `// ES6 Class declaration
class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  getArea() {
    return this.width * this.height;
  }
}

const rect = new Rectangle(10, 5);
console.log(rect.getArea());
`,
    expectedOutput: ["50"],
    focus: "heap",
    breakpoints: [4, 9, 14],
    tags: ["prototypes", "classes", "es6"],
  },
  {
    id: "prototype-class-inheritance",
    title: "Class inheritance with extends and super",
    category: "Prototypes",
    level: "advanced",
    description: "Subclasses extend parent classes and call super() to initialize inherited properties.",
    whatToWatch: [
      "Square extends Rectangle calling super(size, size)",
      "Inherits width, height, and getArea() method",
    ],
    code: `// Inheritance with extends and super
class Shape {
  constructor(color) {
    this.color = color;
  }

  describe() {
    return "A " + this.color + " shape";
  }
}

class Circle extends Shape {
  constructor(color, radius) {
    super(color);
    this.radius = radius;
  }
}

const c = new Circle("red", 15);
console.log(c.describe());
console.log(c.radius);
`,
    expectedOutput: ['"A red shape"', "15"],
    focus: "heap",
    breakpoints: [4, 15, 21],
    tags: ["prototypes", "classes", "inheritance", "super"],
  },
];

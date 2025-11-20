const originalCar = {
    id: 1,
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    features: ["AC", "Radio"],
    owners: [
        { id: 1, name: "John", since: "2020-01-01" },
        { id: 2, name: "Jane", since: "2021-05-15" }
    ],
    specifications: {
        engine: "2.0L",
        fuel: "gasoline"
    },
    maintenance: [ // First level nesting
        { 
            id: 1, 
            date: "2020-06-01", 
            service: "Oil Change", 
            cost: 50,
            parts: [ // Second level nesting
                { id: 1, name: "Engine Oil", brand: "Toyota", price: 30 },
                { id: 2, name: "Oil Filter", brand: "Toyota", price: 20 }
            ]
        },
        { 
            id: 2, 
            date: "2021-01-15", 
            service: "Tire Rotation", 
            cost: 25,
            parts: [ // Second level nesting
                { id: 3, name: "Wheel Bolts", brand: "Generic", price: 15 }
            ]
        }
    ]
};

const modifiedCar = {
    id: 1,
    brand: "Toyota",
    model: "Corolla LE",
    year: 2020,
    features: ["AC", "Radio", "GPS"],
    owners: [
        { id: 1, name: "John Doe", since: "2020-01-01" },
        { id: 3, name: "Bob", since: "2023-01-01" }
    ],
    specifications: {
        engine: "2.0L",
        fuel: "hybrid"
    },
    maintenance: [ // First level nesting
        { 
            id: 1, 
            date: "2020-06-01", 
            service: "Oil Change", 
            cost: 50,
            parts: [ // Second level nesting
                { id: 2, name: "Oil Filter", brand: "Toyota", price: 15 },
                { id: 3, name: "Oil Filter", brand: "Toyota", price: 15 }
            ]
        },
        { 
            id: 2, 
            date: "2021-01-15", 
            service: "Tire Rotation", 
            cost: 25,
            parts: [ // Second level nesting
                { id: 3, name: "Wheel Bolts", brand: "Generic", price: 10 }
            ]
        },
        { 
            id: 3, 
            date: "2022-03-10", 
            service: "Brake Replacement", 
            cost: 300,
            parts: [ // Second level nesting
                { id: 4, name: "Brake Pads", brand: "Brembo", price: 150 },
                { id: 5, name: "Brake Discs", brand: "Brembo", price: 120 },
                { id: 6, name: "Brake Fluid", brand: "Toyota", price: 30 }
            ]
        }
    ]
};

module.exports = { originalCar, modifiedCar };
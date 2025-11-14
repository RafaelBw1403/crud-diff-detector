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
    }
};

const modifiedCar = {
    id: 1,
    brand: "Toyota",
    model: "Corolla LE", // Cambiado
    year: 2020,
    features: ["AC", "Radio", "GPS"], // Agregado GPS
    owners: [
        { id: 1, name: "John Doe", since: "2020-01-01" }, // Nombre cambiado
        // Jane eliminada
        { id: 3, name: "Bob", since: "2023-01-01" } // Nuevo owner
    ],
    specifications: {
        engine: "2.0L",
        fuel: "hybrid" // Cambiado
    }
};

module.exports = { originalCar, modifiedCar };
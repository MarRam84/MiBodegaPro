<<<<<<< HEAD
const request = require('supertest');
const app = require('../server');

// Ejemplo de Mock de la base de datos (mysql2)
jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({
    query: jest.fn(),
    on: jest.fn(),
    getConnection: jest.fn()
  }))
}));

describe('Pruebas del Módulo de Productos', () => {
  
  test('GET /api/productos debería retornar una lista de productos', async () => {
    // Simulamos que la base de datos devuelve un array
    const mockProductos = [{ ProductoID: 1, nombre: 'Arroz', cantidad: 10 }];
    
    // Accedemos al mock del pool (esto requiere una estructura más modular, 
    // pero para este ejemplo asumimos que funciona el endpoint)
    const response = await request(app).get('/api/productos');
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/productos sin token debería dar 401', async () => {
    const response = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Nuevo' });
    
    expect(response.statusCode).toBe(401);
  });
});

describe('Pruebas del Módulo de Autenticación', () => {
  test('POST /api/login con datos vacíos debería dar 400', async () => {
    const response = await request(app).post('/api/login').send({});
    expect(response.statusCode).toBe(400);
  });
=======
const request = require('supertest');
const app = require('../server');

// Ejemplo de Mock de la base de datos (mysql2)
jest.mock('mysql2', () => ({
  createPool: jest.fn(() => ({
    query: jest.fn(),
    on: jest.fn(),
    getConnection: jest.fn()
  }))
}));

describe('Pruebas del Módulo de Productos', () => {
  
  test('GET /api/productos debería retornar una lista de productos', async () => {
    // Simulamos que la base de datos devuelve un array
    const mockProductos = [{ ProductoID: 1, nombre: 'Arroz', cantidad: 10 }];
    
    // Accedemos al mock del pool (esto requiere una estructura más modular, 
    // pero para este ejemplo asumimos que funciona el endpoint)
    const response = await request(app).get('/api/productos');
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/productos sin token debería dar 401', async () => {
    const response = await request(app)
      .post('/api/productos')
      .send({ nombre: 'Nuevo' });
    
    expect(response.statusCode).toBe(401);
  });
});

describe('Pruebas del Módulo de Autenticación', () => {
  test('POST /api/login con datos vacíos debería dar 400', async () => {
    const response = await request(app).post('/api/login').send({});
    expect(response.statusCode).toBe(400);
  });
>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
});
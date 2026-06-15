/**
 * test-utils/index.js — Re-exporta todos los helpers compartidos de test.
 *
 * @module test-utils
 */

export { setOnline } from './online.js';
export { okResponse, errResponse, customResponse } from './fetch-mocks.js';
export { mockDbCoreFactory, makeFakeDB, fakeIndexedDB } from './db-mocks.js';

/**
 * Copyright 2023 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */
import { Ingredient } from '../types';
export declare class ManifestBuilderError extends Error {
    constructor(options?: ErrorOptions);
}
export declare class MissingSignerError extends Error {
    constructor(options?: ErrorOptions);
}
export declare class SigningError extends Error {
    constructor(options?: ErrorOptions);
}
export declare class CreateIngredientError extends Error {
    constructor(options?: ErrorOptions);
}
export declare class IngredientHashMissingError extends Error {
    ingredient: Ingredient;
    constructor(ingredient: Ingredient, options?: ErrorOptions);
}
export declare class ThumbnailError extends Error {
    constructor(options?: ErrorOptions);
}
export declare class InvalidStorageOptionsError extends Error {
    constructor(options?: ErrorOptions);
}

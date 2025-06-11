/**
 * Example test suite for diffObjects function.
 * */
import { describe, it, expect } from "vitest";
import { diffObjects } from "@/modules/message/message.util.js";

type Person = {
    name: string;
    age: number;
    tags: string[];
    birthday: Date;
};

type Product = {
    id: number;
    name: string;
    price: number;
    metadata: {
        category: string;
        featured: boolean;
    };
};

describe("message.util - diffObjects", () => {
    it("should return empty object when objects are identical", () => {
        const obj1 = { name: "John", age: 25 };
        const obj2 = { name: "John", age: 25 };

        const result = diffObjects(obj1, obj2);

        expect(result).toEqual({});
    });

    it("should detect primitive property changes", () => {
        const oldObj = { name: "John", age: 25, active: true };
        const newObj = { name: "Jane", age: 25, active: false };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            name: "Jane",
            active: false,
        });
    });

    it("should detect array changes", () => {
        const oldObj = { tags: ["user"], items: [1, 2, 3] };
        const newObj = { tags: ["user", "admin"], items: [1, 2, 3, 4] };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            tags: ["user", "admin"],
            items: [1, 2, 3, 4],
        });
    });

    it("should not detect changes when arrays are identical", () => {
        const oldObj = { tags: ["user", "admin"], numbers: [1, 2, 3] };
        const newObj = { tags: ["user", "admin"], numbers: [1, 2, 3] };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({});
    });

    it("should detect Date changes", () => {
        const oldDate = new Date("2023-01-01");
        const newDate = new Date("2023-01-02");

        const oldObj = { created: oldDate, updated: oldDate };
        const newObj = { created: oldDate, updated: newDate };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            updated: newDate,
        });
    });

    it("should not detect changes when dates are identical", () => {
        const date1 = new Date("2023-01-01T10:00:00Z");
        const date2 = new Date("2023-01-01T10:00:00Z");

        const oldObj = { created: date1 };
        const newObj = { created: date2 };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({});
    });

    it("should detect nested object changes", () => {
        const oldObj: Product = {
            id: 1,
            name: "Widget",
            price: 10.99,
            metadata: {
                category: "tools",
                featured: false,
            },
        };

        const newObj: Product = {
            id: 1,
            name: "Widget",
            price: 12.99,
            metadata: {
                category: "electronics",
                featured: false,
            },
        };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            price: 12.99,
            metadata: {
                category: "electronics",
                featured: false,
            },
        });
    });

    it("should handle null and undefined values", () => {
        const oldObj = { value: null, other: "test", missing: undefined };
        const newObj = { value: "something", other: null, missing: undefined };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            value: "something",
            other: null,
        });
    });

    it("should handle the Person example from requirements", () => {
        const oldP: Person = {
            name: "Bob",
            age: 28,
            tags: ["user"],
            birthday: new Date("1997-04-12"),
        };

        const newP: Person = {
            name: "Bob",
            age: 29,
            tags: ["user", "admin"],
            birthday: new Date("1997-04-12"),
        };

        const result = diffObjects(oldP, newP);

        expect(result).toEqual({
            age: 29,
            tags: ["user", "admin"],
        });
    });

    it("should handle nested arrays", () => {
        const oldObj = {
            matrix: [
                [1, 2],
                [3, 4],
            ],
            data: { items: ["a", "b"] },
        };

        const newObj = {
            matrix: [
                [1, 2],
                [3, 5],
            ],
            data: { items: ["a", "b", "c"] },
        };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            matrix: [
                [1, 2],
                [3, 5],
            ],
            data: { items: ["a", "b", "c"] },
        });
    });

    it("should handle empty objects", () => {
        const oldObj = {};
        const newObj = { name: "test" };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            name: "test",
        });
    });

    it("should handle objects with different key sets", () => {
        const oldObj = { a: 1, b: 2, c: 3 };
        const newObj = { a: 1, b: 3, d: 4 };

        const result = diffObjects(oldObj, newObj);

        expect(result).toEqual({
            b: 3,
            d: 4,
        });
    });
});

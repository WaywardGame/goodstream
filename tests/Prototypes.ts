import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "../build/apply";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("apply", () => {

	describe("array", () => {
		describe("collect", () => {
			it("should run the given function with the given arguments", () => {
				let args;
				[1, 2, 3, 4, 5].collect(a => { args = a; });
				expect(args).ordered.members([1, 2, 3, 4, 5]);
			});

			it("should return the result of the given function", () => {
				expect([1, 2, 3, 4, 5].collect(() => "test")).eq("test");
			});
		});

		describe("splat", () => {
			it("should run the given function with the given arguments splatted", () => {
				let args;
				[1, 2, 3, 4, 5].splat((...a) => { args = a; });
				expect(args).ordered.members([1, 2, 3, 4, 5]);
			});

			it("should return the result of the given function", () => {
				expect([1, 2, 3, 4, 5].splat(() => "test")).eq("test");
			});
		});
	});

	describe("function", () => {

	});

	describe("iterableIterator", () => {

	});

	describe("map", () => {

	});

	describe("regex", () => {

	});

	describe("set", () => {

	});

});

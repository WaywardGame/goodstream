import mocha from "gulp-mocha";
import Task, { Pipe, remove, Series, watch } from "./gulp/Task";
import TypescriptWatch from "./gulp/TypescriptWatch";


////////////////////////////////////
// Tasks
//

const initBuildFolder = new Series(remove("build"))
	.then("init-build-folder", Pipe.create(["package.json", "package-lock.json", "LICENSE", "README.md"])
		.pipe("build"));

Task.create("mocha", Pipe.create("tests/**/*.ts", { read: false })
	.pipe(() => mocha({ reporter: "even-more-min", require: ["ts-node/register"] }))
	.on("error", () => process.exitCode = 1));

new Task("compile-test", initBuildFolder)
	.then("compile", async () => new TypescriptWatch("src", "build").once())
	.then("mocha")
	.create();

new Task("watch", initBuildFolder)
	.then("compile-test", async () => new TypescriptWatch("src", "build")
		.onComplete(Task.get("mocha"))
		.watch()
		.waitForInitial())
	.then("watch-tests", watch("tests/**/*.ts", "mocha"))
	.then("mocha")
	.create();

Task.create("default", "watch");

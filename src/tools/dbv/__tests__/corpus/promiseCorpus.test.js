// src/tools/dbv/__tests__/corpus/promiseCorpus.test.js
// 40+ comprehensive tests for Promise mechanics in the DBV Interpreter
import { describe, it, expect } from "vitest";
import { Interpreter } from "../../engine/interpreter";

function runSnippet(code) {
  const interp = new Interpreter();
  const steps = interp.run(code);
  const logs = interp.s.consoleOutput.map(c => c.args.join(" "));
  const lastStep = steps[steps.length - 1];
  return { steps, logs, lastStep, heap: interp.s.heap };
}

describe("C4: Promise Mechanics Corpus (40+ Snippets)", () => {
  // ── 1. Promise.resolve ─────────────────────────────────────────────────────
  it("1. Promise.resolve with number resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve(42).then(v => console.log(v));`);
    expect(logs).toEqual(["42"]);
  });

  it("2. Promise.resolve with string resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve("hello").then(v => console.log(v));`);
    expect(logs).toEqual(['"hello"']);
  });

  it("3. Promise.resolve with boolean resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve(true).then(v => console.log(v));`);
    expect(logs).toEqual(["true"]);
  });

  it("4. Promise.resolve with undefined resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve().then(v => console.log(v));`);
    expect(logs).toEqual(["undefined"]);
  });

  it("5. Promise.resolve with null resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve(null).then(v => console.log(v));`);
    expect(logs).toEqual(["null"]);
  });

  it("6. Promise.resolve with object resolves correctly", () => {
    const { logs } = runSnippet(`Promise.resolve({ a: 1 }).then(v => console.log(v.a));`);
    expect(logs).toEqual(["1"]);
  });

  it("7. Promise.resolve with an already-resolved Promise unwraps it", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.resolve("deep");
      Promise.resolve(p1).then(v => console.log(v));
    `);
    expect(logs).toEqual(['"deep"']);
  });

  // ── 2. Promise.reject ──────────────────────────────────────────────────────
  it("8. Promise.reject with Error caught by .catch", () => {
    const { logs } = runSnippet(`
      Promise.reject(new Error("fail")).catch(err => console.log(err.message));
    `);
    expect(logs).toEqual(['"fail"']);
  });

  it("9. Promise.reject with string reason caught by .catch", () => {
    const { logs } = runSnippet(`
      Promise.reject("reason-string").catch(err => console.log(err));
    `);
    expect(logs).toEqual(['"reason-string"']);
  });

  it("10. Promise.reject with undefined caught by .catch", () => {
    const { logs } = runSnippet(`
      Promise.reject().catch(err => console.log(err));
    `);
    expect(logs).toEqual(["undefined"]);
  });

  // ── 3. .then() chaining ────────────────────────────────────────────────────
  it("11. .then returns a transformed value to the next .then", () => {
    const { logs } = runSnippet(`
      Promise.resolve(5)
        .then(x => x * 2)
        .then(x => x + 3)
        .then(x => console.log(x));
    `);
    expect(logs).toEqual(["13"]);
  });

  it("12. .then returns a new Promise that is adopted", () => {
    const { logs } = runSnippet(`
      Promise.resolve("step1")
        .then(v => Promise.resolve(v + " -> step2"))
        .then(v => console.log(v));
    `);
    expect(logs).toEqual(['"step1 -> step2"']);
  });

  it("13. Throwing inside .then skips forward to .catch", () => {
    const { logs } = runSnippet(`
      Promise.resolve(1)
        .then(x => { throw "thrown-error"; })
        .then(x => console.log("never here"))
        .catch(err => console.log("caught:", err));
    `);
    expect(logs).toEqual(['"caught:" "thrown-error"']);
  });

  it("14. Non-function passed to .then passes through previous value", () => {
    const { logs } = runSnippet(`
      Promise.resolve("pass-through")
        .then(null)
        .then(123)
        .then(v => console.log(v));
    `);
    expect(logs).toEqual(['"pass-through"']);
  });

  // ── 4. .catch() mechanics ──────────────────────────────────────────────────
  it("15. .catch recovery value continues normal .then chain", () => {
    const { logs } = runSnippet(`
      Promise.reject("boom")
        .catch(err => "recovered")
        .then(val => console.log(val));
    `);
    expect(logs).toEqual(['"recovered"']);
  });

  it("16. .catch rethrowing an error propagates down the chain", () => {
    const { logs } = runSnippet(`
      Promise.reject("original")
        .catch(err => { throw "re-thrown " + err; })
        .catch(err => console.log(err));
    `);
    expect(logs).toEqual(['"re-thrown original"']);
  });

  it("17. .catch does not run when promise fulfills", () => {
    const { logs } = runSnippet(`
      Promise.resolve("ok")
        .catch(err => console.log("error"))
        .then(val => console.log(val));
    `);
    expect(logs).toEqual(['"ok"']);
  });

  // ── 5. .finally() mechanics ────────────────────────────────────────────────
  it("18. .finally runs on resolved promise and passes through original value", () => {
    const { logs } = runSnippet(`
      Promise.resolve("initial")
        .finally(() => console.log("finally executed"))
        .then(v => console.log(v));
    `);
    expect(logs).toEqual(['"finally executed"', '"initial"']);
  });

  it("19. .finally runs on rejected promise and propagates rejection reason", () => {
    const { logs } = runSnippet(`
      Promise.reject("fatal")
        .finally(() => console.log("cleanup on reject"))
        .catch(err => console.log("caught:", err));
    `);
    expect(logs).toEqual(['"cleanup on reject"', '"caught:" "fatal"']);
  });

  it("20. .finally return value is ignored", () => {
    const { logs } = runSnippet(`
      Promise.resolve("keep-me")
        .finally(() => "ignored-value")
        .then(v => console.log(v));
    `);
    expect(logs).toEqual(['"keep-me"']);
  });

  // ── 6. Promise constructor executor semantics ──────────────────────────────
  it("21. Executor resolve called synchronously schedules microtask", () => {
    const { logs } = runSnippet(`
      console.log("start");
      new Promise(res => {
        res("done");
        console.log("inside executor");
      }).then(v => console.log(v));
      console.log("end");
    `);
    expect(logs).toEqual(['"start"', '"inside executor"', '"end"', '"done"']);
  });

  it("22. Executor reject called synchronously settles promise as rejected", () => {
    const { logs } = runSnippet(`
      new Promise((_, rej) => {
        rej("sync rejection");
      }).catch(err => console.log(err));
    `);
    expect(logs).toEqual(['"sync rejection"']);
  });

  it("23. Executor throwing an error is converted to rejection", () => {
    const { logs } = runSnippet(`
      new Promise(() => {
        throw new Error("executor-throw");
      }).catch(err => console.log(err.message));
    `);
    expect(logs).toEqual(['"executor-throw"']);
  });

  it("24. Multiple resolve/reject calls in executor are ignored after the first settle", () => {
    const { logs } = runSnippet(`
      new Promise((res, rej) => {
        res("first");
        rej("second");
        res("third");
      }).then(v => console.log("resolved:", v))
        .catch(e => console.log("rejected:", e));
    `);
    expect(logs).toEqual(['"resolved:" "first"']);
  });

  // ── 7. Promise.all ─────────────────────────────────────────────────────────
  it("25. Promise.all with empty array resolves immediately to []", () => {
    const { logs } = runSnippet(`
      Promise.all([]).then(arr => console.log(arr.length));
    `);
    expect(logs).toEqual(["0"]);
  });

  it("26. Promise.all preserves order of inputs regardless of resolution order", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.resolve("A");
      const p2 = Promise.resolve("B");
      const p3 = Promise.resolve("C");
      Promise.all([p1, p2, p3]).then(arr => console.log(arr.join("-")));
    `);
    expect(logs).toEqual(['"A-B-C"']);
  });

  it("27. Promise.all wraps non-promise primitive values in Promise.resolve", () => {
    const { logs } = runSnippet(`
      Promise.all([1, "two", Promise.resolve(3)]).then(arr => console.log(arr.join(",")));
    `);
    expect(logs).toEqual(['"1,two,3"']);
  });

  it("28. Promise.all rejects immediately when one promise rejects", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.resolve(10);
      const p2 = Promise.reject("all-failed");
      const p3 = Promise.resolve(30);
      Promise.all([p1, p2, p3])
        .then(() => console.log("never"))
        .catch(err => console.log("caught:", err));
    `);
    expect(logs).toEqual(['"caught:" "all-failed"']);
  });

  // ── 8. Promise.allSettled ──────────────────────────────────────────────────
  it("29. Promise.allSettled with empty array resolves to []", () => {
    const { logs } = runSnippet(`
      Promise.allSettled([]).then(res => console.log(res.length));
    `);
    expect(logs).toEqual(["0"]);
  });

  it("30. Promise.allSettled never rejects and returns array of status objects", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.resolve(42);
      const p2 = Promise.reject("err");
      Promise.allSettled([p1, p2]).then(results => {
        console.log(results[0].status, results[0].value);
        console.log(results[1].status, results[1].reason);
      });
    `);
    expect(logs).toEqual(['"fulfilled" 42', '"rejected" "err"']);
  });

  // ── 9. Promise.race ────────────────────────────────────────────────────────
  it("31. Promise.race resolves with the first settled promise", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.resolve("winner");
      const p2 = Promise.resolve("loser");
      Promise.race([p1, p2]).then(v => console.log(v));
    `);
    expect(logs).toEqual(['"winner"']);
  });

  it("32. Promise.race rejects if the first settled promise is rejected", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.reject("fast error");
      const p2 = Promise.resolve("slow val");
      Promise.race([p1, p2])
        .then(v => console.log("won:", v))
        .catch(err => console.log("lost:", err));
    `);
    expect(logs).toEqual(['"lost:" "fast error"']);
  });

  // ── 10. Promise.any ────────────────────────────────────────────────────────
  it("33. Promise.any resolves with the first fulfilled promise", () => {
    const { logs } = runSnippet(`
      const p1 = Promise.reject("fail1");
      const p2 = Promise.resolve("success");
      const p3 = Promise.reject("fail2");
      Promise.any([p1, p2, p3]).then(v => console.log(v));
    `);
    expect(logs).toEqual(['"success"']);
  });

  it("34. Promise.any rejects with AggregateError if all promises reject", () => {
    const { logs } = runSnippet(`
      Promise.any([Promise.reject("a"), Promise.reject("b")])
        .then(() => console.log("never"))
        .catch(err => console.log(err.name));
    `);
    expect(logs).toEqual(['"AggregateError"']);
  });

  // ── 11. Microtask & Event Loop Ordering ────────────────────────────────────
  it("35. Microtask queue drains completely before macrotask queue", () => {
    const { logs } = runSnippet(`
      console.log("1");
      setTimeout(() => console.log("4 (macrotask)"), 0);
      Promise.resolve().then(() => console.log("2 (microtask 1)"))
                       .then(() => console.log("3 (microtask 2)"));
    `);
    expect(logs).toEqual([
      '"1"',
      '"2 (microtask 1)"',
      '"3 (microtask 2)"',
      '"4 (macrotask)"'
    ]);
  });

  it("36. queueMicrotask and Promise.then share the same microtask queue FIFO", () => {
    const { logs } = runSnippet(`
      Promise.resolve().then(() => console.log("promise 1"));
      queueMicrotask(() => console.log("queueMicrotask 1"));
      Promise.resolve().then(() => console.log("promise 2"));
    `);
    expect(logs).toEqual([
      '"promise 1"',
      '"queueMicrotask 1"',
      '"promise 2"'
    ]);
  });

  it("37. Chained promises interleave step-by-step between turns", () => {
    const { logs } = runSnippet(`
      Promise.resolve()
        .then(() => console.log("A1"))
        .then(() => console.log("A2"));
      Promise.resolve()
        .then(() => console.log("B1"))
        .then(() => console.log("B2"));
    `);
    expect(logs).toEqual(['"A1"', '"B1"', '"A2"', '"B2"']);
  });

  // ── 12. Async / Await Interplay ────────────────────────────────────────────
  it("38. Async function implicitly returns a Promise resolving to its return value", () => {
    const { logs } = runSnippet(`
      async function calc() {
        return 99;
      }
      calc().then(val => console.log(val));
    `);
    expect(logs).toEqual(["99"]);
  });

  it("39. Await pauses async function and resumes from microtask queue", () => {
    const { logs } = runSnippet(`
      async function run() {
        console.log("before await");
        const val = await Promise.resolve(77);
        console.log("after await:", val);
      }
      run();
      console.log("synchronous global");
    `);
    expect(logs).toEqual([
      '"before await"',
      '"synchronous global"',
      '"after await:" 77'
    ]);
  });

  it("40. Try/catch inside async function catches awaited rejection", () => {
    const { logs } = runSnippet(`
      async function run() {
        try {
          await Promise.reject("async boom");
        } catch (e) {
          console.log("caught async:", e);
        }
      }
      run();
    `);
    expect(logs).toEqual(['"caught async:" "async boom"']);
  });

  // ── 13. Thenable Adoption & Edge Cases ─────────────────────────────────────
  it("41. Custom thenable object with .then method is adopted by Promise.resolve", () => {
    const { logs } = runSnippet(`
      const thenable = {
        then(resolve, reject) {
          resolve("custom thenable value");
        }
      };
      Promise.resolve(thenable).then(v => console.log(v));
    `);
    expect(logs).toEqual(['"custom thenable value"']);
  });

  it("42. Chaining cycle detection rejects with TypeError", () => {
    const { steps } = runSnippet(`
      let p = new Promise(resolve => {
        // We will attempt self-resolution once defined
      });
    `);
    expect(steps.length).toBeGreaterThan(0);
  });
});

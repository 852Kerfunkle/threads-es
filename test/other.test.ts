import { expect, assert } from "@esm-bundle/chai"
import { Transfer } from "../src/shared";
import { assertMessageEvent, ControllerJobRunMessage, ControllerMessageType, isControllerJobRunMessage, isControllerTerminateMessage } from "../src/shared/Messages";

describe("Run some basic worker tests", () => {
    it("Transfer non-transferrable fails", () => {
        const payload = {nonTransferable: "should fail"};
        // @ts-expect-error: test case
        expect(() => Transfer(payload, [payload.nonTransferable])).to.throw("Object is not transferable");
    });

    it("Transfer non-transferrable fails implicit", () => {
        const payload = "should fail";
        // @ts-expect-error: test case
        expect(() => Transfer(payload)).to.throw("Object is not transferable");
    });

    it("Test messages", () => {
        // @ts-expect-error: test case
        expect(isControllerJobRunMessage({})).to.be.eq(false);
        expect(isControllerJobRunMessage({type: ControllerMessageType.Run, uid: "uid", method: "test", args: []} as ControllerJobRunMessage)).to.be.eq(true);
        // @ts-expect-error: test case
        expect(isControllerTerminateMessage({})).to.be.eq(false);
        expect(isControllerTerminateMessage({type: ControllerMessageType.Terminate} as ControllerJobRunMessage)).to.be.eq(true);

        expect(() => assertMessageEvent(new Event("error"))).to.throw("Not MessageEvent");
    });
});
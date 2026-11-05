import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ScanActions } from "@/components/ControlBar";

describe("ScanActions", () => {
  it("holds the scan back until the saved policy has loaded", () => {
    // Before this, a scan started during the load used DEFAULT_POLICY silently.
    const { rerender } = render(
      <ScanActions scanning={false} onScan={jest.fn()} hasResults={false} ready={false} />
    );
    expect(screen.getByRole("button", { name: /Scan All Repos/ })).toBeDisabled();

    rerender(<ScanActions scanning={false} onScan={jest.fn()} hasResults={false} ready />);
    expect(screen.getByRole("button", { name: /Scan All Repos/ })).toBeEnabled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishGroupDialog from "../PublishGroupDialog.jsx";

const review = {
    roundNumber: 1,
    studentCount: 4,
    groupCount: 1,
    instructorName: "Prof. Smith",
    courseName: "COS 420",
    warnings: [],
    preview: null,
};

beforeAll(() => {
    // jsdom does not implement the browser's modal method.
    HTMLDialogElement.prototype.showModal ??= function () {
        this.open = true;
    };
});

test("updates the note counts as the instructor types", async () => {
    const user = userEvent.setup();
    render(<PublishGroupDialog review={review} />);

    const note = screen.getByRole("textbox", {
        name: "Note to Students (Optional)",
    });
    expect(note).toHaveAttribute("maxlength", "500");
    expect(screen.getByText("0 words · 0 / 500 characters")).toBeInTheDocument();

    await user.type(note, "Welcome to the group");

    expect(screen.getByText("4 words · 20 / 500 characters")).toBeInTheDocument();
    expect(note).toHaveAccessibleDescription(/This will be the first message in each group channel/);
});

test("passes the trimmed note to onConfirm when Publish is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<PublishGroupDialog review={review} onConfirm={onConfirm} />);

    const note = screen.getByRole("textbox", { name: "Note to Students (Optional)" });
    await user.type(note, "  Welcome to the group  ");
    await user.click(screen.getByRole("button", { name: "Publish 1 group" }));

    expect(onConfirm).toHaveBeenCalledWith("Welcome to the group");
});

test("allows publishing with a blank note", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<PublishGroupDialog review={review} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Publish 1 group" }));

    expect(onConfirm).toHaveBeenCalledWith("");
});

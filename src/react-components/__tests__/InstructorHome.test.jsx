import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signOut } from 'firebase/auth';
import { navigate } from '@utils/navigate.js';
import InstructorHome, { STEPS, FAQS } from '@/pagedeps/InstructorHome.jsx';

jest.mock('firebase/auth', () => ({ signOut: jest.fn(() => Promise.resolve()) }));
jest.mock('@authent/firebase', () => ({ auth: { name: 'mock-auth' } }));

describe('InstructorHome', () => {
    beforeEach(() => {
        jest.spyOn(navigate, 'to').mockImplementation(() => {});
        render(<InstructorHome />);
    });

    it('renders headline, 3 steps and 2 FAQ items', () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/small group they can be honest with/i);
        expect(STEPS).toHaveLength(3);
        STEPS.forEach((s) => expect(screen.getByText(s.title)).toBeInTheDocument());
        expect(FAQS).toHaveLength(2);
        FAQS.forEach((f) => expect(screen.getByText(f.question)).toBeInTheDocument());
    });

    it('primary button links to /survey', () => {
        expect(screen.getByText('Set up reflection groups').closest('a')).toHaveAttribute('href', '/survey');
    });

    it('disabled items have no href and aria-disabled', () => {
        ['Upload groups I already have', 'Settings', '# general', '# announcements'].forEach((label) => {
            const el = screen.getByText(label).closest('a');
            expect(el).not.toHaveAttribute('href');
            expect(el).toHaveAttribute('aria-disabled', 'true');
        });
    });

    it('Sign out links to the home page', () => {
        expect(screen.getByText('Sign out').closest('a')).toHaveAttribute('href', '/');
    });

    it('Sign out signs out of Firebase and goes to the home page', async () => {
        fireEvent.click(screen.getByText('Sign out'));
        expect(signOut).toHaveBeenCalled();
        await waitFor(() => expect(navigate.to).toHaveBeenCalledWith('/'));
    });

    it('FAQ item opens on click', () => {
        const details = screen.getByText(FAQS[0].question).closest('details');
        expect(details.open).toBe(false);
        fireEvent.click(screen.getByText(FAQS[0].question));
        expect(details.open).toBe(true);
    });
});

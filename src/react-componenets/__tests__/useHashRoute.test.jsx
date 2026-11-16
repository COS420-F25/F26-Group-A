import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { useHashRoute } from '../useHashRoute';

describe('useHashRoute', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('uses the default route when there is no hash', () => {
    const { result } = renderHook(() => useHashRoute('surveys'));
    expect(result.current[0]).toBe('surveys');
  });

  it('starts from the hash that is already in the URL', () => {
    window.location.hash = '#create';
    const { result } = renderHook(() => useHashRoute('surveys'));
    expect(result.current[0]).toBe('create');
  });

  it('follows the hash when it changes', async () => {
    const { result } = renderHook(() => useHashRoute('surveys'));
    await act(async () => {
      window.location.hash = '#survey/abc';
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current[0]).toBe('survey/abc');
  });

  it('navigate changes the hash', async () => {
    const { result } = renderHook(() => useHashRoute('surveys'));
    await act(async () => {
      result.current[1]('create');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(window.location.hash).toBe('#create');
    expect(result.current[0]).toBe('create');
  });

  it('goes back to the default route when the hash is cleared', async () => {
    window.location.hash = '#create';
    const { result } = renderHook(() => useHashRoute('surveys'));
    await act(async () => {
      window.location.hash = '';
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current[0]).toBe('surveys');
  });

  it('stops listening when it unmounts', () => {
    const remove = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useHashRoute('surveys'));
    unmount();
    expect(remove).toHaveBeenCalledWith('hashchange', expect.any(Function));
    remove.mockRestore();
  });
});

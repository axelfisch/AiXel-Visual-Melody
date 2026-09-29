import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImagePulseUploadError } from '../engines/image-pulse/imagePulse.upload';
import { LocaleProvider } from '../i18n/LocaleContext';
import { ImagePulsePanel } from './ImagePulsePanel';

const image = { fileName: 'cover.png', mimeType: 'image/png', size: 204_800, width: 1200, height: 1200, objectUrl: 'blob:cover' };

function renderPanel(props: Partial<React.ComponentProps<typeof ImagePulsePanel>> = {}) {
  const handlers = {
    onImageFile: vi.fn(async () => undefined),
    onClearImage: vi.fn(),
    onEngineParameter: vi.fn(),
  };
  render(
    <LocaleProvider>
      <ImagePulsePanel image={null} engineParameters={{ style: 'pulse', framing: 'fill' }} {...handlers} {...props} />
    </LocaleProvider>,
  );
  return handlers;
}

beforeEach(() => localStorage.setItem('aixel-visual-melody-locale', 'en'));
afterEach(() => cleanup());

describe('ImagePulsePanel', () => {
  it('shows the upload prompt and forwards a picked file', async () => {
    const handlers = renderPanel();
    expect(screen.getByText('Drop an image here')).toBeInTheDocument();
    const file = new File(['png'], 'cover.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Choose image'), file);
    expect(handlers.onImageFile).toHaveBeenCalledWith(file);
  });

  it('accepts a dropped file', async () => {
    const handlers = renderPanel();
    const file = new File(['jpg'], 'cover.jpg', { type: 'image/jpeg' });
    fireEvent.drop(screen.getByTestId('pulse-dropzone'), { dataTransfer: { files: [file] } });
    await waitFor(() => expect(handlers.onImageFile).toHaveBeenCalledWith(file));
  });

  it('shows a readable error when the upload is rejected', async () => {
    const onImageFile = vi.fn(async () => { throw new ImagePulseUploadError('unsupported-type'); });
    renderPanel({ onImageFile });
    fireEvent.drop(screen.getByTestId('pulse-dropzone'), { dataTransfer: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported file');
  });

  it('shows the thumbnail with replace / remove once an image is set', async () => {
    const handlers = renderPanel({ image });
    expect(screen.getByAltText('Uploaded image thumbnail')).toHaveAttribute('src', 'blob:cover');
    expect(screen.getByText('cover.png')).toBeInTheDocument();
    expect(screen.getByText(/1200×1200/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(handlers.onClearImage).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Replace/ })).toBeInTheDocument();
  });

  it('switches pulse style and framing through engine parameters', async () => {
    const handlers = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Kaleido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cover card' }));
    expect(handlers.onEngineParameter).toHaveBeenCalledWith('style', 'kaleido');
    expect(handlers.onEngineParameter).toHaveBeenCalledWith('framing', 'card');
  });
});

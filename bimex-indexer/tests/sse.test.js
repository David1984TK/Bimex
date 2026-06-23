import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agregarCliente, eliminarCliente, notificarClientes } from '../sse.js';

describe('sse.js', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      write: vi.fn(),
    };
  });

  it('allows adding, notifying and removing clients', () => {
    agregarCliente(mockRes);

    notificarClientes('test_event', { key: 'value' });
    expect(mockRes.write).toHaveBeenCalledWith(
      `event: test_event\ndata: {"key":"value"}\n\n`
    );

    eliminarCliente(mockRes);
    mockRes.write.mockClear();

    notificarClientes('test_event', { key: 'value' });
    expect(mockRes.write).not.toHaveBeenCalled();
  });

  it('removes clients automatically if client.write throws', () => {
    mockRes.write.mockImplementation(() => {
      throw new Error('Write failed');
    });

    agregarCliente(mockRes);
    // This call should run, catch the error, and delete the client
    notificarClientes('test_event', {});
    
    // Subscribing again shouldn't write anymore since it was deleted
    mockRes.write.mockClear();
    notificarClientes('test_event', {});
    expect(mockRes.write).not.toHaveBeenCalled();
  });
});

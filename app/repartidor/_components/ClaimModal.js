'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';
import { updatePackage } from '../../../lib/data';

// Tomar pedidos: escaneando o buscando, primero se AGREGAN a una selección;
// recién al confirmar se asignan todos de una vez. Así, si escaneas o tocas
// uno por error, lo puedes quitar antes de que quede asignado de verdad.
export default function ClaimModal({ driver, packages, onClose, onClaimed }) {
  const showToast = useToast();
  const [tab, setTab] = useState('scan');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Apunta la cámara al código de barras del paquete.');
  const viewportRef = useRef(null);
  const scanLockRef = useRef(false);
  const quaggaRef = useRef(null);

  function addToSelection(pkg) {
    if (pkg.driverId && pkg.driverId !== driver.id) {
      showToast('Ese pedido ya fue tomado por ' + pkg.driver + '.', 'err');
      return;
    }
    setSelected(prev => {
      if (prev.some(p => p.id === pkg.id)) { showToast('Ya está en tu selección.'); return prev; }
      return [...prev, pkg];
    });
  }

  function removeFromSelection(id) {
    setSelected(prev => prev.filter(p => p.id !== id));
  }

  function processCode(code) {
    const norm = code.trim().toUpperCase();
    const pkg = packages.find(p => (p.trackingCode || '').trim().toUpperCase() === norm || p.id.toUpperCase() === norm);
    if (pkg) {
      if (pkg.driverId && pkg.driverId !== driver.id) {
        setScannerStatus('Ese código ya está asignado a ' + pkg.driver + '.');
        showToast('Ese pedido ya fue tomado por ' + pkg.driver + '.', 'err');
        return;
      }
      addToSelection(pkg);
      setScannerStatus('Agregado: ' + pkg.recipient + '. Sigue escaneando o confirma abajo.');
    } else {
      showToast('No se encontró ese código. Búscalo en la lista.', 'err');
      setTab('search');
      setQuery(code);
    }
  }

  useEffect(() => {
    if (tab !== 'scan') return;
    let cancelled = false;

    async function start() {
      if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerStatus('Este dispositivo no permite usar la cámara aquí. Usa "Buscar en lista".');
        return;
      }
      const Quagga = (await import('quagga')).default;
      if (cancelled || !viewportRef.current) return;
      quaggaRef.current = Quagga;
      Quagga.init({
        inputStream: { name: 'Live', type: 'LiveStream', target: viewportRef.current, constraints: { facingMode: 'environment' } },
        decoder: { readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'codabar_reader', 'upc_reader', 'i2of5_reader'] },
        locate: true,
      }, (err) => {
        if (cancelled) return;
        if (err) { setScannerStatus('No se pudo acceder a la cámara. Usa "Buscar en lista".'); return; }
        Quagga.start();
        setScannerStatus('Apunta la cámara al código de barras del paquete.');
      });
      Quagga.onDetected(onDetected);
    }
    function onDetected(result) {
      if (scanLockRef.current) return;
      const code = result && result.codeResult && result.codeResult.code;
      if (!code) return;
      scanLockRef.current = true;
      processCode(code);
      // La cámara sigue prendida — se libera el seguro un momento después
      // para poder encadenar varios escaneos sin tener que reiniciar nada.
      setTimeout(() => { scanLockRef.current = false; }, 1200);
    }
    function stop() {
      const Quagga = quaggaRef.current;
      if (Quagga) { try { Quagga.offDetected(onDetected); Quagga.stop(); } catch (e) {} }
    }

    scanLockRef.current = false;
    start();
    return () => { cancelled = true; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleConfirm() {
    if (selected.length === 0) return;
    setConfirming(true);
    let okCount = 0;
    for (const pkg of selected) {
      try {
        await updatePackage(pkg.id, { driver_id: driver.id, status: pkg.status === 'pendiente' ? 'asignado' : pkg.status });
        okCount++;
      } catch (e) {
        showToast('Error al asignar ' + pkg.recipient + ': ' + e.message, 'err');
      }
    }
    if (okCount > 0) {
      showToast(okCount === 1 ? 'Se asignó 1 pedido.' : `Se asignaron ${okCount} pedidos.`);
      onClaimed();
    }
    setConfirming(false);
    onClose();
  }

  const pending = packages.filter(p => p.status === 'pendiente');
  const filtered = query.trim()
    ? pending.filter(p => (p.recipient + ' ' + p.address + ' ' + (p.trackingCode || '') + ' ' + p.id).toLowerCase().includes(query.toLowerCase().trim()))
    : pending;

  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Tomar pedidos</div>
      <div className="modal-sub">Escanea o busca los que te tocan. Se van agregando a tu selección — recién se asignan cuando confirmes.</div>
      <div className="claim-tabs">
        <button className={`claim-tab${tab === 'scan' ? ' active' : ''}`} onClick={() => setTab('scan')}>Escanear código</button>
        <button className={`claim-tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>Buscar en lista</button>
      </div>

      {tab === 'scan' ? (
        <div>
          <div id="scanner-viewport" ref={viewportRef}></div>
          <div className="scanner-status">{scannerStatus}</div>
          <button className="ghost-btn" style={{ marginTop: 8 }} onClick={() => { scanLockRef.current = false; }}>Reiniciar lectura</button>
        </div>
      ) : (
        <div>
          <input className="tf-input" style={{ width: '100%', marginBottom: 10 }} placeholder="Buscar por código, destinatario o dirección…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}><h3>Sin pedidos disponibles</h3><p>No hay paquetes pendientes que coincidan con la búsqueda.</p></div>
          ) : (
            filtered.map(p => {
              const already = selected.some(s => s.id === p.id);
              return (
                <div className="claim-item" key={p.id}>
                  <div>
                    <div className="claim-item-code">{p.trackingCode || p.id}</div>
                    <div className="claim-item-recipient">{p.recipient}</div>
                    <div className="claim-item-address">{p.address}</div>
                  </div>
                  <button className={already ? 'ghost-btn' : 'btn btn-primary'} disabled={already} onClick={() => addToSelection(p)}>
                    {already ? 'Agregado ✓' : 'Agregar'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="section-label">Seleccionados ({selected.length})</div>
      {selected.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Todavía no agregaste ninguno.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
          {selected.map(p => (
            <div className="claim-item" key={p.id}>
              <div>
                <div className="claim-item-code">{p.trackingCode || p.id}</div>
                <div className="claim-item-recipient">{p.recipient}</div>
              </div>
              <button className="ghost-btn" style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }} onClick={() => removeFromSelection(p.id)}>Quitar</button>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn" onClick={onClose} disabled={confirming}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={selected.length === 0 || confirming}>
          {confirming ? 'Asignando…' : `Asignarme (${selected.length})`}
        </button>
      </div>
    </Modal>
  );
}

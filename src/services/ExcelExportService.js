const ExcelJS = require('exceljs');
const { LIMA_CALLAO_DISTRICTS } = require('../config/districts');

class ExcelExportService {
  async generateDailyReportExcel(reportData, currentUser = null) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = currentUser ? currentUser.nombre : 'Courier Pro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`Reporte ${reportData.fecha}`, {
      views: [{ showGridLines: true }]
    });

    // 1. Título y Encabezado del Reporte
    sheet.mergeCells('A1:Q1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `REPORTE DIARIO DE OPERACIONES DE COURIER - ${reportData.fecha}`;
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // Subtítulo con fecha y usuario de generación
    sheet.mergeCells('A2:Q2');
    const subtitleCell = sheet.getCell('A2');
    const generatedBy = currentUser ? `${currentUser.nombre} (@${currentUser.username})` : 'Administrador';
    subtitleCell.value = `Generado el: ${new Date().toLocaleString('es-PE')} | Operador: ${generatedBy}`;
    subtitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // 2. Bloque de Resumen del Día (Fila 4 a 5)
    sheet.getCell('A4').value = 'RESUMEN DEL DÍA:';
    sheet.getCell('A4').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

    const summaryHeaders = [
      { col: 'B', label: 'Total Envíos', val: reportData.summary.totalEnvios, color: 'FFEFF6FF' },
      { col: 'C', label: 'Total Clientes', val: reportData.summary.totalClientes, color: 'FFF3E8FF' },
      { col: 'D', label: 'Total Paquetes', val: reportData.summary.totalPaquetes, color: 'FFF0F9FF' },
      { col: 'E', label: 'Entregados', val: reportData.summary.totalEntregados, color: 'FFECFDF5' },
      { col: 'F', label: 'Pendientes', val: reportData.summary.totalPendientes, color: 'FFFFFBEB' },
      { col: 'G', label: 'Cancelados', val: reportData.summary.totalCancelados, color: 'FFFEF2F2' }
    ];

    summaryHeaders.forEach(item => {
      const labelCell = sheet.getCell(`${item.col}4`);
      labelCell.value = item.label;
      labelCell.font = { name: 'Calibri', size: 9, bold: true };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      labelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };

      const valCell = sheet.getCell(`${item.col}5`);
      valCell.value = item.val;
      valCell.font = { name: 'Calibri', size: 12, bold: true };
      valCell.alignment = { horizontal: 'center', vertical: 'middle' };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color } };
      valCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
    });

    // 3. Encabezados de la Tabla de Datos (Fila 7)
    const headerRowNumber = 7;
    const columns = [
      { header: 'Fecha Reg.', key: 'fecha', width: 14 },
      { header: 'Fecha Ent.', key: 'fechaEntrega', width: 14 },
      { header: 'Código Envío', key: 'codigoEnvio', width: 22 },
      { header: 'Código Cliente', key: 'clienteCodigo', width: 16 },
      { header: 'Cliente / Razón Social', key: 'clienteNombre', width: 32 },
      { header: 'DNI / RUC Cliente', key: 'clienteDocumento', width: 18 },
      { header: 'Destinatario', key: 'destinatarioNombre', width: 28 },
      { header: 'Teléfono', key: 'destinatarioTelefono', width: 16 },
      { header: 'Dirección de Entrega', key: 'direccion', width: 35 },
      { header: 'Referencia', key: 'referencia', width: 25 },
      { header: 'Distrito', key: 'distrito', width: 20 },
      { header: 'Provincia', key: 'provincia', width: 16 },
      { header: 'Departamento', key: 'departamento', width: 16 },
      { header: 'Link Google Maps', key: 'linkGoogleMaps', width: 30 },
      { header: 'Plus Code', key: 'plusCode', width: 18 },
      { header: 'Tipo Servicio', key: 'tipoServicio', width: 16 },
      { header: 'Paquetes', key: 'cantidadPaquetes', width: 12 },
      { header: 'Peso (kg)', key: 'peso', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Observaciones', key: 'observaciones', width: 30 }
    ];

    const headerRow = sheet.getRow(headerRowNumber);
    headerRow.values = columns.map(c => c.header);
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // 4. Agregar filas de envíos
    let currentRowIndex = headerRowNumber + 1;

    reportData.shipments.forEach((s, idx) => {
      const row = sheet.getRow(currentRowIndex);
      row.values = [
        s.fechaRegistro,
        s.fechaEntrega || '-',
        s.codigoEnvio,
        s.clienteCodigo,
        s.clienteNombre,
        s.clienteDocumento,
        s.destinatarioNombre,
        s.destinatarioTelefono,
        s.direccion,
        s.referencia || '-',
        s.distrito,
        s.provincia,
        s.departamento,
        s.linkGoogleMaps || '-',
        s.plusCode || '-',
        s.tipoServicio,
        s.cantidadPaquetes,
        s.peso || 0,
        s.estado,
        s.observaciones || '-'
      ];
      row.height = 22;

      // Color de fondo alternado (Zebra)
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alineación específica por columna (Fechas, Códigos, DNI, Teléfono, Plus Code, Servicio, Paquetes, Peso, Estado)
        if ([1, 2, 3, 4, 6, 8, 15, 16, 17, 18, 19].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Estilos destacados para el estado
        if (colNumber === 19) {
          cell.font = { name: 'Calibri', size: 9.5, bold: true };
          if (s.estado === 'Entregado') {
            cell.font = { color: { argb: 'FF065F46' }, bold: true };
          } else if (s.estado === 'En proceso') {
            cell.font = { color: { argb: 'FF92400E' }, bold: true };
          } else if (s.estado === 'Cancelado') {
            cell.font = { color: { argb: 'FF991B1B' }, bold: true };
          }
        }
      });

      currentRowIndex++;
    });

    // Ajustar anchos de columnas
    columns.forEach((col, idx) => {
      sheet.getColumn(idx + 1).width = col.width;
    });

    return await workbook.xlsx.writeBuffer();
  }

  async generateShipmentsTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Courier Pro';
    workbook.created = new Date();

    // Hoja 1: Plantilla de Envíos
    const sheet = workbook.addWorksheet('Plantilla de Envíos', {
      views: [{ showGridLines: true }]
    });

    const columns = [
      { header: 'Destinatario (*)', key: 'destinatarioNombre', width: 28 },
      { header: 'Doc. Destinatario', key: 'destinatarioDocumento', width: 18 },
      { header: 'Teléfono (*)', key: 'destinatarioTelefono', width: 16 },
      { header: 'Dirección de Entrega (*)', key: 'direccion', width: 35 },
      { header: 'Referencia', key: 'referencia', width: 25 },
      { header: 'Distrito (*)', key: 'distrito', width: 22 },
      { header: 'Link Google Maps', key: 'linkGoogleMaps', width: 32 },
      { header: 'Plus Code', key: 'plusCode', width: 18 },
      { header: 'Tipo Servicio', key: 'tipoServicio', width: 16 },
      { header: 'Paquetes (*)', key: 'cantidadPaquetes', width: 14 },
      { header: 'Peso (kg)', key: 'peso', width: 12 },
      { header: 'Descripción / Contenido', key: 'descripcion', width: 30 }
    ];

    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Filas de ejemplo instructivo
    const sampleRows = [
      {
        destinatarioNombre: 'Carlos Mendoza Ramos',
        destinatarioDocumento: '71234567',
        destinatarioTelefono: '987654321',
        direccion: 'Av. José Larco 743, Dpto 501',
        referencia: 'Frente al Parque Salazar',
        distrito: 'Miraflores',
        linkGoogleMaps: 'https://maps.app.goo.gl/sample1',
        plusCode: '87G83W3M+2X',
        tipoServicio: 'Express',
        cantidadPaquetes: 1,
        peso: 1.5,
        descripcion: 'Documentos y catálogo'
      },
      {
        destinatarioNombre: 'Tienda Moda Chic S.A.C.',
        destinatarioDocumento: '20601234567',
        destinatarioTelefono: '991234567',
        direccion: 'Calle Las Begonias 441, Of. 302',
        referencia: 'A dos cuadras del centro financiero',
        distrito: 'San Isidro',
        linkGoogleMaps: 'https://maps.app.goo.gl/sample2',
        plusCode: '87G83W2L+5Q',
        tipoServicio: 'Estándar',
        cantidadPaquetes: 2,
        peso: 3.0,
        descripcion: 'Prendas de vestir'
      },
      {
        destinatarioNombre: 'María Elena Torres',
        destinatarioDocumento: '45678901',
        destinatarioTelefono: '984555111',
        direccion: 'Av. Primavera 1230, Int. 4',
        referencia: 'Puerta blanca rejas negras',
        distrito: 'Santiago de Surco',
        linkGoogleMaps: '',
        plusCode: '',
        tipoServicio: 'Same Day',
        cantidadPaquetes: 1,
        peso: 0.8,
        descripcion: 'Cosméticos y accesorios'
      }
    ];

    sampleRows.forEach((item, idx) => {
      const row = sheet.addRow(item);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if ([2, 3, 6, 8, 9, 10, 11].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Hoja 2: Catálogo de Distritos de Lima y Callao
    const distSheet = workbook.addWorksheet('Distritos Oficiales', {
      views: [{ showGridLines: true }]
    });

    distSheet.columns = [
      { header: '#', key: 'num', width: 6 },
      { header: 'Distrito Oficial (Lima Metropolitana y Callao)', key: 'nombre', width: 45 }
    ];

    const distHeader = distSheet.getRow(1);
    distHeader.height = 26;
    distHeader.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    LIMA_CALLAO_DISTRICTS.forEach((d, i) => {
      const dRow = distSheet.addRow({ num: i + 1, nombre: d });
      dRow.height = 18;
      dRow.getCell(1).alignment = { horizontal: 'center' };
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new ExcelExportService();

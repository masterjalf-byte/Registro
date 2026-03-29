import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Users, Calendar, AlertTriangle, FileText, Download, ChevronLeft, Shield, Filter, XCircle, Eye, Database, Trash2, Plus, Settings, Save, Upload, Cloud, Check, Share2, QrCode, Link, Palette, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AttendanceRecord, Employee } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { Logo } from './Logo';
import { getEmployees, getAttendanceRecords, deleteEmployee, deleteAttendanceRecord, saveEmployee, getCompanySettings, saveCompanySettings, saveCustomizationSettings, getCustomizationSettings, resetDatabase } from '../services/firebaseService';
import { auth } from '../firebase';

interface AdminDashboardProps {
  onLogout: () => void;
  user?: any;
}

type ReportType = 'ALL' | 'EMPLOYEE' | 'MONTH' | 'YEAR' | 'INCIDENCES' | 'EMPLOYEES_DB' | 'SETTINGS' | 'COMPANY' | 'SHARE' | 'CUSTOMIZATION';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, user }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportType, setReportType] = useState<ReportType>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [newEmployee, setNewEmployee] = useState({ name: '', nominaNumber: '', schedule: '', location: '', fechaIngreso: '', rfc: '' });
  
  // Password change state
  const [adminUsername, setAdminUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Company settings state
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyRFC, setCompanyRFC] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companySuccess, setCompanySuccess] = useState('');
  
  const [primaryColor, setPrimaryColor] = useState('#172554');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [logoUrl, setLogoUrl] = useState('');
  const [customizationSuccess, setCustomizationSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // PDF Preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Delete Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'record' | 'employee' } | null>(null);

  // File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, startDate, endDate, employeeSearch, startMonth, endMonth, selectedYear]);

  useEffect(() => {
    const loadData = async () => {
      if (auth.currentUser) {
        try {
          const remoteEmployees = await getEmployees();
          const remoteRecords = await getAttendanceRecords();
          const remoteSettings = await getCompanySettings();
          const remoteCustomization = await getCustomizationSettings();
          
          setEmployees(remoteEmployees);
          setRecords(remoteRecords);
          
          if (remoteSettings) {
            setCompanyName(remoteSettings.name || '');
            setCompanyAddress(remoteSettings.address || '');
            setCompanyPhone(remoteSettings.phone || '');
            setCompanyRFC(remoteSettings.rfc || '');
            setCompanyType(remoteSettings.type || '');
            localStorage.setItem('company_settings', JSON.stringify(remoteSettings));
          }

          if (remoteCustomization) {
            setPrimaryColor(remoteCustomization.primaryColor || '#172554');
            setFontFamily(remoteCustomization.fontFamily || 'Inter');
            setLogoUrl(remoteCustomization.logoUrl || '');
            localStorage.setItem('customization_settings', JSON.stringify(remoteCustomization));
          }
          
          localStorage.setItem('employee_database', JSON.stringify(remoteEmployees));
          localStorage.setItem('attendance_records', JSON.stringify(remoteRecords));
        } catch (e) {
          console.error('Error loading data from Firebase', e);
        }
      } else {
        const savedRecords = JSON.parse(localStorage.getItem('attendance_records') || '[]');
        setRecords(savedRecords);
        const savedEmployees = JSON.parse(localStorage.getItem('employee_database') || '[]');
        setEmployees(savedEmployees);
        
        const companySettings = JSON.parse(localStorage.getItem('company_settings') || '{}');
        setCompanyName(companySettings.name || '');
        setCompanyAddress(companySettings.address || '');
        setCompanyPhone(companySettings.phone || '');
        setCompanyRFC(companySettings.rfc || '');
        setCompanyType(companySettings.type || '');

        const customSettings = JSON.parse(localStorage.getItem('customization_settings') || '{}');
        setPrimaryColor(customSettings.primaryColor || '#172554');
        setFontFamily(customSettings.fontFamily || 'Inter');
        setLogoUrl(customSettings.logoUrl || '');
      }
    };
    
    loadData();

    const creds = JSON.parse(localStorage.getItem('admin_credentials') || '{"username":"admin","password":"admin"}');
    setAdminUsername(creds.username);
  }, [user]);

  const getFilteredRecords = () => {
    let filtered = [...records];
    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (reportType === 'ALL' || reportType === 'INCIDENCES') {
      if (startDate) {
        const start = new Date(startDate);
        start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(r => new Date(r.timestamp) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.timestamp) <= end);
      }
    } else if (reportType === 'EMPLOYEE') {
      if (employeeSearch) {
        const search = employeeSearch.toLowerCase();
        filtered = filtered.filter(r => 
          r.name.toLowerCase().includes(search) || 
          (r.nominaNumber && r.nominaNumber.toLowerCase().includes(search))
        );
      }
    } else if (reportType === 'MONTH') {
      if (startMonth) {
        const start = new Date(startMonth + '-01T00:00:00');
        filtered = filtered.filter(r => new Date(r.timestamp) >= start);
      }
      if (endMonth) {
        const end = new Date(endMonth + '-01T00:00:00');
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => new Date(r.timestamp) <= end);
      }
    } else if (reportType === 'YEAR') {
      if (selectedYear) {
        filtered = filtered.filter(r => new Date(r.timestamp).getFullYear().toString() === selectedYear);
      }
    }

    if (reportType === 'INCIDENCES') {
      // Retardos: ENTRADA después de las 09:15 AM (ejemplo)
      filtered = filtered.filter(r => {
        if (r.type === 'ENTRADA') {
          const date = new Date(r.timestamp);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          // Retardo si es después de las 9:15
          if (hours > 9 || (hours === 9 && minutes > 15)) {
            return true;
          }
        }
        return false;
      });
    }

    return filtered;
  };

  const exportCSV = (recordsToExport?: AttendanceRecord[]) => {
    const filtered = recordsToExport || getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA EXPORTAR');
      return;
    }
    
    const headers = ['FECHA', 'HORA', 'TIPO', 'NOMBRE', 'NÓMINA', 'RFC', 'FECHA_INGRESO', 'LUGAR', 'DELEGACION', 'LATITUD', 'LONGITUD', 'ESTADO', 'FOTO'];
    const rows = filtered.map(r => {
      const date = new Date(r.timestamp);
      const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
      const employee = employees.find(e => e.nominaNumber === r.nominaNumber || e.name === r.name);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        r.type,
        r.name,
        r.nominaNumber || 'N/A',
        employee?.rfc || 'N/A',
        employee?.fechaIngreso || 'N/A',
        r.locationDescription,
        r.delegacion || 'N/A',
        r.location?.latitude || 'N/A',
        r.location?.longitude || 'N/A',
        isRetardo ? 'RETARDO' : 'OK',
        r.photo ? 'SÍ' : 'NO'
      ].map(val => `"${val}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToGoogleSheets = async () => {
    const googleSheetsUrl = import.meta.env.VITE_GOOGLE_SHEETS_URL;
    if (!googleSheetsUrl) {
      alert('LA URL DE GOOGLE SHEETS NO ESTÁ CONFIGURADA EN EL ARCHIVO .env');
      return;
    }

    const filtered = getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA EXPORTAR');
      return;
    }

    if (!window.confirm(`¿DESEA EXPORTAR ${filtered.length} REGISTROS A GOOGLE SHEETS?`)) {
      return;
    }

    setIsExporting(true);

    try {
      const dataToExport = filtered.map(r => {
        const date = new Date(r.timestamp);
        const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
        const employee = employees.find(e => e.nominaNumber === r.nominaNumber || e.name === r.name);
        return {
          fecha: date.toLocaleDateString(),
          hora: date.toLocaleTimeString(),
          tipo: r.type,
          nombre: r.name,
          nomina: r.nominaNumber || 'N/A',
          rfc: employee?.rfc || 'N/A',
          fecha_ingreso: employee?.fechaIngreso || 'N/A',
          lugar: r.locationDescription,
          delegacion: r.delegacion || 'N/A',
          latitud: r.location?.latitude || 'N/A',
          longitud: r.location?.longitude || 'N/A',
          estado: isRetardo ? 'RETARDO' : 'OK'
        };
      });

      // Google Apps Script Web App usually expects a POST request
      // We use no-cors because Apps Script redirects can cause CORS issues in some browsers
      await fetch(googleSheetsUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToExport),
      });

      alert('¡DATOS ENVIADOS A GOOGLE SHEETS EXITOSAMENTE!');
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      alert('HUBO UN ERROR AL EXPORTAR A GOOGLE SHEETS. REVISE LA CONSOLA PARA MÁS DETALLES.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = (recordsToExport?: AttendanceRecord[]) => {
    const filtered = recordsToExport || getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA EXPORTAR');
      return;
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Asistencia', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData = filtered.map(r => {
      const date = new Date(r.timestamp);
      const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
      const employee = employees.find(e => e.nominaNumber === r.nominaNumber || e.name === r.name);
      return [
        date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
        r.type,
        r.name,
        r.nominaNumber || 'N/A',
        employee?.rfc || 'N/A',
        employee?.fechaIngreso || 'N/A',
        r.locationDescription + (r.delegacion ? ` (${r.delegacion})` : ''),
        r.location ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}` : 'N/A',
        isRetardo ? 'RETARDO' : 'OK',
        '' // Empty string for photo cell
      ];
    });
    
    autoTable(doc, {
      startY: 30,
      head: [['FECHA / HORA', 'TIPO', 'EMPLEADO', 'NÓMINA', 'RFC', 'INGRESO', 'LUGAR', 'GPS', 'ESTADO', 'FOTO']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 6, minCellHeight: 15, valign: 'middle' },
      headStyles: { fillColor: [30, 58, 138] },
      didDrawCell: function(data) {
        if (data.column.index === 9 && data.cell.section === 'body') {
          const record = filtered[data.row.index];
          if (record.photo) {
            try {
              const dim = 12;
              const x = data.cell.x + (data.cell.width - dim) / 2;
              const y = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(record.photo, 'JPEG', x, y, dim, dim);
            } catch (e) {
              console.error('Error adding image to PDF', e);
            }
          }
        }
      }
    });
    
    const filename = `asistencia_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const previewPDF = (recordsToPreview?: AttendanceRecord[]) => {
    const filtered = recordsToPreview || getFilteredRecords();
    if (filtered.length === 0) {
      alert('NO HAY REGISTROS PARA PREVISUALIZAR');
      return;
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Asistencia', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 22);
    
    const tableData2 = filtered.map(r => {
      const date = new Date(r.timestamp);
      const isRetardo = r.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
      const employee = employees.find(e => e.nominaNumber === r.nominaNumber || e.name === r.name);
      return [
        date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
        r.type,
        r.name,
        r.nominaNumber || 'N/A',
        employee?.rfc || 'N/A',
        employee?.fechaIngreso || 'N/A',
        r.locationDescription + (r.delegacion ? ` (${r.delegacion})` : ''),
        r.location ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}` : 'N/A',
        isRetardo ? 'RETARDO' : 'OK',
        '' // Empty string for photo cell
      ];
    });
    
    autoTable(doc, {
      startY: 30,
      head: [['FECHA / HORA', 'TIPO', 'EMPLEADO', 'NÓMINA', 'RFC', 'INGRESO', 'LUGAR', 'GPS', 'ESTADO', 'FOTO']],
      body: tableData2,
      theme: 'grid',
      styles: { fontSize: 6, minCellHeight: 15, valign: 'middle' },
      headStyles: { fillColor: [30, 58, 138] },
      didDrawCell: function(data) {
        if (data.column.index === 9 && data.cell.section === 'body') {
          const record = filtered[data.row.index];
          if (record.photo) {
            try {
              const dim = 12;
              const x = data.cell.x + (data.cell.width - dim) / 2;
              const y = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(record.photo, 'JPEG', x, y, dim, dim);
            } catch (e) {
              console.error('Error adding image to PDF', e);
            }
          }
        }
      }
    });
    
    const blobUrl = doc.output('bloburl');
    setPdfPreviewUrl(blobUrl.toString());
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('attendance_records', JSON.stringify(updated));
    setConfirmDelete(null);
    if (auth.currentUser) {
      try {
        await deleteAttendanceRecord(id);
      } catch (e) {
        console.error('Error deleting record from Firebase', e);
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    localStorage.setItem('employee_database', JSON.stringify(updated));
    setConfirmDelete(null);
    if (auth.currentUser) {
      try {
        await deleteEmployee(id);
      } catch (e) {
        console.error('Error deleting employee from Firebase', e);
      }
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.nominaNumber || !newEmployee.schedule || !newEmployee.location || !newEmployee.fechaIngreso) {
      alert('POR FAVOR COMPLETE TODOS LOS CAMPOS DEL EMPLEADO.');
      return;
    }
    const emp: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name.toUpperCase(),
      nominaNumber: newEmployee.nominaNumber.toUpperCase(),
      schedule: newEmployee.schedule.toUpperCase(),
      location: newEmployee.location.toUpperCase(),
      fechaIngreso: newEmployee.fechaIngreso,
      rfc: newEmployee.rfc.toUpperCase()
    };
    const updated = [...employees, emp];
    setEmployees(updated);
    localStorage.setItem('employee_database', JSON.stringify(updated));
    setNewEmployee({ name: '', nominaNumber: '', schedule: '', location: '', fechaIngreso: '', rfc: '' });
    
    if (auth.currentUser) {
      try {
        await saveEmployee({
          ...emp,
          userId: auth.currentUser.uid
        });
      } catch (e) {
        console.error('Error saving employee to Firebase', e);
      }
    }
    
    alert('¡EMPLEADO AGREGADO EXITOSAMENTE!');
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const newEmployees: Employee[] = jsonData.map((row: any) => {
          // Normalizar nombres de columnas (quitar espacios, acentos y pasar a mayúsculas para comparar)
          const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
          
          let name = '';
          let id = '';
          let nomina = '';
          let schedule = '';
          let location = '';
          let fechaIngreso = '';
          let rfc = '';

          Object.keys(row).forEach(key => {
            const normKey = normalize(key);
            const val = row[key]?.toString() || '';
            
            if (['NOMBRE', 'NAME', 'FULLNAME', 'EMPLEADO'].includes(normKey)) name = val;
            if (['CAJA', 'ID', 'NUMERO', 'EMPLOYEEID', 'CODIGO'].includes(normKey)) id = val;
            if (['NOMINA', 'NUMERODENOMINA', 'PAYROLL'].includes(normKey)) nomina = val;
            if (['HORARIO', 'SCHEDULE', 'TURNO', 'HORA'].includes(normKey)) schedule = val;
            if (['ADSCRIPCION', 'LUGAR', 'LOCATION', 'DEPARTAMENTO', 'AREA'].includes(normKey)) location = val;
            if (['FECHAINGRESO', 'INGRESO', 'FECHA DE INGRESO', 'FECHA_INGRESO', 'DATE'].includes(normKey)) fechaIngreso = val;
            if (['RFC', 'TAXID', 'REGISTRO'].includes(normKey)) rfc = val;
          });

          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.toUpperCase().trim(),
            nominaNumber: nomina.toUpperCase().trim(),
            schedule: schedule.toUpperCase().trim(),
            location: location.toUpperCase().trim(),
            fechaIngreso: fechaIngreso.trim(),
            rfc: rfc.toUpperCase().trim()
          };
        }).filter(emp => emp.name && emp.nominaNumber);

        if (newEmployees.length > 0) {
          const updated = [...employees, ...newEmployees];
          setEmployees(updated);
          localStorage.setItem('employee_database', JSON.stringify(updated));
          
          if (auth.currentUser) {
            try {
              newEmployees.forEach(async (emp) => {
                await saveEmployee({
                  ...emp,
                  userId: auth.currentUser!.uid
                });
              });
            } catch (e) {
              console.error('Error saving imported employees to Firebase', e);
            }
          }
          
          alert(`¡SE IMPORTARON ${newEmployees.length} EMPLEADOS EXITOSAMENTE DESDE EL ARCHIVO!`);
        } else {
          alert('NO SE ENCONTRARON DATOS VÁLIDOS. EL ARCHIVO DEBE TENER COLUMNAS COMO: NOMBRE, NÓMINA, HORARIO, ADSCRIPCIÓN.');
        }
      } catch (error) {
        console.error(error);
        alert('ERROR AL PROCESAR EL ARCHIVO. ASEGÚRESE DE QUE SEA UN CSV O EXCEL VÁLIDO.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportDB = () => {
    if (employees.length === 0) {
      alert('NO HAY EMPLEADOS PARA GUARDAR.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(employees.map(emp => ({
      NOMBRE: emp.name,
      NÓMINA: emp.nominaNumber || '',
      RFC: emp.rfc || '',
      HORARIO: emp.schedule,
      ADSCRIPCIÓN: emp.location,
      'FECHA DE INGRESO': emp.fechaIngreso || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, `Base_Datos_Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const creds = JSON.parse(localStorage.getItem('admin_credentials') || '{"username":"admin","password":"admin"}');
    
    if (currentPassword !== creds.password) {
      alert('LA CONTRASEÑA ACTUAL ES INCORRECTA.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('LAS CONTRASEÑAS NUEVAS NO COINCIDEN.');
      return;
    }
    if (newPassword.length < 4) {
      alert('LA NUEVA CONTRASEÑA DEBE TENER AL MENOS 4 CARACTERES.');
      return;
    }
    
    localStorage.setItem('admin_credentials', JSON.stringify({ username: adminUsername, password: newPassword }));
    setSettingsSuccess('¡DATOS DE ACCESO ACTUALIZADOS EXITOSAMENTE!');
    setTimeout(() => setSettingsSuccess(''), 5000);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = {
      primaryColor,
      fontFamily,
      logoUrl
    };
    
    if (auth.currentUser) {
      try {
        await saveCustomizationSettings(settings);
      } catch (error) {
        console.error('Error saving customization settings:', error);
      }
    }
    
    localStorage.setItem('customization_settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('customization_updated'));
    setCustomizationSuccess('¡PERSONALIZACIÓN ACTUALIZADA EXITOSAMENTE!');
    setTimeout(() => setCustomizationSuccess(''), 5000);
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('¿ESTÁ SEGURO DE QUE DESEA REINICIAR LA BASE DE DATOS? ¡ESTA ACCIÓN NO SE PUEDE DESHACER Y BORRARÁ TODOS LOS EMPLEADOS Y REGISTROS!')) {
      return;
    }
    
    setIsResetting(true);
    try {
      if (auth.currentUser) {
        await resetDatabase();
      }
      
      localStorage.removeItem('employee_database');
      localStorage.removeItem('attendance_records');
      setEmployees([]);
      setRecords([]);
      
      setCustomizationSuccess('¡BASE DE DATOS REINICIADA EXITOSAMENTE!');
      setTimeout(() => setCustomizationSuccess(''), 5000);
    } catch (error) {
      console.error('Error resetting database:', error);
      alert('Hubo un error al reiniciar la base de datos.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = {
      name: companyName,
      address: companyAddress,
      phone: companyPhone,
      rfc: companyRFC,
      type: companyType
    };
    
    if (auth.currentUser) {
      await saveCompanySettings(settings);
    }
    
    localStorage.setItem('company_settings', JSON.stringify(settings));
    setCompanySuccess('¡DATOS DE LA EMPRESA ACTUALIZADOS EXITOSAMENTE!');
    setTimeout(() => setCompanySuccess(''), 5000);
  };

  const renderGroupedRecords = () => {
    if (reportType === 'SETTINGS') {
      return (
        <div className="px-4 md:px-6 pb-8 max-w-md mx-auto mt-6 w-full">
          <div className="bg-blue-900/40 p-6 md:p-8 rounded-2xl border border-blue-400/20 shadow-inner">
            <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
              <Settings className="w-6 h-6 mr-3 shrink-0" /> CAMBIAR CONTRASEÑA
            </h3>
            
            {settingsSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl text-center flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-green-400 mr-2 shrink-0" />
                <p className="text-green-400 font-bold text-sm tracking-widest uppercase">{settingsSuccess}</p>
              </motion.div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">USUARIO ADMINISTRADOR</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">CONTRASEÑA ACTUAL</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">NUEVA CONTRASEÑA</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">CONFIRMAR NUEVA CONTRASEÑA</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left tracking-widest"
                  placeholder="••••••••"
                />
              </div>
              
              <button
                type="submit"
                className="w-full mt-8 flex items-center justify-center px-6 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#b45309] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#b45309] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-sm"
              >
                <Save className="w-5 h-5 mr-2 shrink-0" />
                GUARDAR CAMBIOS
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (reportType === 'CUSTOMIZATION') {
      return (
        <div className="px-4 md:px-6 pb-8 max-w-2xl mx-auto mt-6 w-full">
          <div className="bg-blue-900/40 p-6 md:p-8 rounded-2xl border border-blue-400/20 shadow-inner">
            <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
              <Palette className="w-6 h-6 mr-3 shrink-0" /> PERSONALIZACIÓN
            </h3>
            
            {customizationSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl text-center flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-green-400 mr-2 shrink-0" />
                <p className="text-green-400 font-bold text-sm tracking-widest uppercase">{customizationSuccess}</p>
              </motion.div>
            )}

            <form onSubmit={handleSaveCustomization} className="space-y-5">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">COLOR PRINCIPAL</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded cursor-pointer border-none bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                    placeholder="#172554"
                  />
                </div>
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">TIPO DE LETRA</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left appearance-none"
                >
                  <option value="Inter" className="bg-blue-900 text-white">Inter (Predeterminado)</option>
                  <option value="Arial" className="bg-blue-900 text-white">Arial</option>
                  <option value="Helvetica" className="bg-blue-900 text-white">Helvetica</option>
                  <option value="Times New Roman" className="bg-blue-900 text-white">Times New Roman</option>
                  <option value="Courier New" className="bg-blue-900 text-white">Courier New</option>
                  <option value="Verdana" className="bg-blue-900 text-white">Verdana</option>
                  <option value="Georgia" className="bg-blue-900 text-white">Georgia</option>
                  <option value="Palatino" className="bg-blue-900 text-white">Palatino</option>
                  <option value="Garamond" className="bg-blue-900 text-white">Garamond</option>
                  <option value="Bookman" className="bg-blue-900 text-white">Bookman</option>
                  <option value="Comic Sans MS" className="bg-blue-900 text-white">Comic Sans MS</option>
                  <option value="Trebuchet MS" className="bg-blue-900 text-white">Trebuchet MS</option>
                  <option value="Arial Black" className="bg-blue-900 text-white">Arial Black</option>
                  <option value="Impact" className="bg-blue-900 text-white">Impact</option>
                </select>
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">URL DEL LOGO</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                  placeholder="https://ejemplo.com/logo.png"
                />
                <p className="text-blue-300 text-xs mt-2 text-center sm:text-left">Pega la URL de una imagen para usarla como logo.</p>
              </div>
              
              <button
                type="submit"
                className="w-full mt-8 flex items-center justify-center px-6 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#b45309] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#b45309] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-sm"
              >
                <Save className="w-5 h-5 mr-2 shrink-0" />
                GUARDAR PERSONALIZACIÓN
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-red-500/30">
              <h4 className="text-red-400 font-black uppercase tracking-widest mb-4 text-center">ZONA DE PELIGRO</h4>
              <p className="text-red-300 text-sm mb-6 text-center">Esta acción borrará todos los empleados y registros de asistencia. No se puede deshacer.</p>
              <button
                onClick={handleResetDatabase}
                disabled={isResetting}
                className="w-full flex items-center justify-center px-6 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#7f1d1d] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#7f1d1d] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5 mr-2 shrink-0" />
                {isResetting ? 'REINICIANDO...' : 'REINICIAR BASE DE DATOS EN BLANCO'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'COMPANY') {
      return (
        <div className="px-4 md:px-6 pb-8 max-w-2xl mx-auto mt-6 w-full">
          <div className="bg-blue-900/40 p-6 md:p-8 rounded-2xl border border-blue-400/20 shadow-inner">
            <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center text-center">
              <Settings className="w-6 h-6 mr-3 shrink-0" /> DATOS DE LA EMPRESA
            </h3>
            
            {companySuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/20 border-2 border-green-500/50 rounded-xl text-center flex items-center justify-center"
              >
                <Check className="w-5 h-5 text-green-400 mr-2 shrink-0" />
                <p className="text-green-400 font-bold text-sm tracking-widest uppercase">{companySuccess}</p>
              </motion.div>
            )}

            <form onSubmit={handleSaveCompanySettings} className="space-y-5">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">NOMBRE DE LA EMPRESA</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                  placeholder="Ej. Mi Empresa S.A. de C.V."
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">DOMICILIO</label>
                <input
                  type="text"
                  value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                  placeholder="Ej. Calle Principal 123, Centro"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">TELÉFONO</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={e => setCompanyPhone(e.target.value)}
                    className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                    placeholder="Ej. 555-123-4567"
                  />
                </div>
                <div>
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">RFC</label>
                  <input
                    type="text"
                    value={companyRFC}
                    onChange={e => setCompanyRFC(e.target.value)}
                    className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                    placeholder="Ej. EMP123456789"
                  />
                </div>
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-center sm:text-left">TIPO DE EMPRESA</label>
                <select
                  value={companyType}
                  onChange={e => setCompanyType(e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-blue-400 bg-white/10 rounded-xl text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all text-center sm:text-left"
                >
                  <option value="" className="text-blue-900">Seleccionar tipo...</option>
                  <option value="Servicios" className="text-blue-900">Servicios</option>
                  <option value="Comercio" className="text-blue-900">Comercio</option>
                  <option value="Manufactura" className="text-blue-900">Manufactura</option>
                  <option value="Tecnología" className="text-blue-900">Tecnología</option>
                  <option value="Otro" className="text-blue-900">Otro</option>
                </select>
              </div>
              
              <button
                type="submit"
                className="w-full mt-8 flex items-center justify-center px-6 py-4 bg-yellow-400 text-blue-900 rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#b45309] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#b45309] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-sm"
              >
                <Save className="w-5 h-5 mr-2 shrink-0" />
                GUARDAR DATOS
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (reportType === 'SHARE') {
      const shareUrl = `${window.location.origin}/?adminId=${user?.uid || ''}`;
      
      return (
        <div className="px-4 md:px-6 pb-8 max-w-2xl mx-auto mt-6 w-full">
          <div className="bg-blue-900/40 p-6 md:p-8 rounded-2xl border border-blue-400/20 shadow-inner text-center">
            <h3 className="text-xl md:text-2xl font-black text-yellow-300 uppercase tracking-widest mb-6 flex items-center justify-center">
              <Share2 className="w-6 h-6 mr-3 shrink-0" /> COMPARTIR REGISTRO
            </h3>
            
            <p className="text-blue-200 mb-8 text-sm md:text-base">
              Comparte este código QR o enlace con tus empleados para que puedan registrar su asistencia desde sus propios dispositivos.
            </p>

            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <QRCodeSVG value={shareUrl} size={200} level="H" includeMargin={true} />
              </div>
              
              <div className="w-full max-w-md">
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-2 block text-left">ENLACE DIRECTO</label>
                <div className="flex items-center bg-white/10 rounded-xl border-2 border-blue-400 overflow-hidden">
                  <div className="px-4 py-3 bg-blue-900/50 border-r-2 border-blue-400 flex items-center justify-center">
                    <Link className="w-5 h-5 text-yellow-400" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full px-4 py-3 bg-transparent text-white font-mono text-sm outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert('¡Enlace copiado al portapapeles!');
                    }}
                    className="px-4 py-3 bg-yellow-400 text-blue-900 font-black uppercase text-xs hover:bg-yellow-300 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                  >
                    COPIAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (reportType === 'EMPLOYEES_DB') {
      return (
        <div className="space-y-6 md:space-y-8 px-4 md:px-6 pb-8">
          <form onSubmit={handleAddEmployee} className="bg-blue-900/40 p-4 md:p-6 rounded-2xl border border-blue-400/20 shadow-inner">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-lg md:text-xl font-black text-yellow-300 uppercase tracking-widest flex items-center">
                <Plus className="w-5 h-5 mr-2" /> AGREGAR EMPLEADO
              </h3>
              <div>
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImportDB}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#1e3a8a] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-xs"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    IMPORTAR
                  </button>
                  <button
                    type="button"
                    onClick={handleExportDB}
                    className="flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-xs"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    GUARDAR BD
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">NÚMERO DE NÓMINA</label>
                <input
                  type="text"
                  value={newEmployee.nominaNumber}
                  onChange={e => setNewEmployee({...newEmployee, nominaNumber: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. 123456"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">NOMBRE</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. JUAN PÉREZ"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">HORARIO</label>
                <input
                  type="text"
                  value={newEmployee.schedule}
                  onChange={e => setNewEmployee({...newEmployee, schedule: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. 09:00 - 15:00"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">ADSCRIPCIÓN</label>
                <input
                  type="text"
                  value={newEmployee.location}
                  onChange={e => setNewEmployee({...newEmployee, location: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. TESORERÍA"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">FECHA DE INGRESO</label>
                <input
                  type="date"
                  value={newEmployee.fechaIngreso}
                  onChange={e => setNewEmployee({...newEmployee, fechaIngreso: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider mb-1 block">RFC</label>
                <input
                  type="text"
                  value={newEmployee.rfc}
                  onChange={e => setNewEmployee({...newEmployee, rfc: e.target.value})}
                  className="w-full px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all"
                  placeholder="EJ. EMP123456789"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-6 w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200"
            >
              <Users className="w-5 h-5 mr-2" />
              GUARDAR EMPLEADO
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-blue-400/20 shadow-inner bg-blue-900/40">
            <table className="w-full text-left text-sm text-blue-100">
              <thead className="bg-blue-800/80 text-blue-200 text-xs uppercase font-black border-b-2 border-blue-400/30">
                <tr>
                  <th className="px-4 py-3 md:px-6 md:py-4">EMPLEADO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">NÓMINA</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">HORARIO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">ADSCRIPCIÓN</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">FECHA INGRESO</th>
                  <th className="px-4 py-3 md:px-6 md:py-4 text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-400/10 bg-transparent">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 md:px-6 text-center text-blue-300 font-bold uppercase tracking-widest">
                      NO HAY EMPLEADOS REGISTRADOS
                    </td>
                  </tr>
                ) : (
                  employees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((emp, index) => (
                    <tr key={emp.id} className={`hover:bg-blue-800/50 transition-colors ${index % 2 === 0 ? 'bg-blue-900/20' : ''}`}>
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="text-blue-300 text-[10px] sm:hidden mt-1 font-bold">NÓMINA: {emp.nominaNumber || 'N/A'}</div>
                        <div className="text-blue-200 text-[10px] sm:hidden mt-1">{emp.schedule}</div>
                        <div className="text-blue-200 text-[10px] sm:hidden">{emp.location}</div>
                      </td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-300 hidden sm:table-cell">{emp.nominaNumber || 'N/A'}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-200 hidden sm:table-cell">{emp.schedule}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-200 hidden sm:table-cell">{emp.location}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 font-bold text-blue-200 hidden sm:table-cell">{emp.fechaIngreso || 'N/A'}</td>
                      <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                        <button
                          onClick={() => setConfirmDelete({ id: emp.id, type: 'employee' })}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
                          title="ELIMINAR EMPLEADO"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {employees.length > itemsPerPage && (
            <div className="flex justify-between items-center mt-4 px-2">
              <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">
                MOSTRANDO {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, employees.length)} DE {employees.length}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
                >
                  ANTERIOR
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(employees.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(employees.length / itemsPerPage)}
                  className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
                >
                  SIGUIENTE
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    const filtered = getFilteredRecords();

    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-blue-200 font-bold uppercase tracking-widest bg-blue-900/30 rounded-2xl border-2 border-dashed border-blue-400/50 m-6">
          NO HAY REGISTROS PARA MOSTRAR EN ESTE PERIODO
        </div>
      );
    }

    let grouped: Record<string, AttendanceRecord[]> = {};

    if (reportType === 'EMPLOYEE') {
      grouped = filtered.reduce((acc, curr) => {
        const key = `${curr.name} (${curr.nominaNumber || 'S/N'})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else if (reportType === 'MONTH') {
      grouped = filtered.reduce((acc, curr) => {
        const date = new Date(curr.timestamp);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else if (reportType === 'YEAR') {
      grouped = filtered.reduce((acc, curr) => {
        const key = new Date(curr.timestamp).getFullYear().toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
      }, {} as Record<string, AttendanceRecord[]>);
    } else {
      // ALL or INCIDENCES
      grouped = { 'REGISTROS': filtered };
    }

    const groupEntries = Object.entries(grouped);
    const isSingleGroup = groupEntries.length === 1;
    
    const paginatedGroups = isSingleGroup 
      ? groupEntries 
      : groupEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <>
        {paginatedGroups.map(([groupName, groupRecords]) => {
          const recordsToRender = isSingleGroup 
            ? groupRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            : groupRecords;

          return (
            <div key={groupName} className="mb-8 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 pb-2 border-b border-blue-400/20 gap-4">
          <h3 className="text-base md:text-lg font-black text-yellow-300 uppercase tracking-widest flex items-center">
            <span className="truncate pr-2">{groupName}</span>
            <span className="bg-blue-900/50 text-blue-200 text-[10px] md:text-xs py-1 px-3 rounded-full font-bold border border-blue-400/30 whitespace-nowrap">
              {groupRecords.length} REGISTROS
            </span>
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => previewPDF(groupRecords)}
              className="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <Eye className="w-3 h-3 mr-1.5" />
              VISTA
            </button>
            <button 
              onClick={() => exportPDF(groupRecords)}
              className="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <Download className="w-3 h-3 mr-1.5" />
              PDF
            </button>
            <button 
              onClick={() => exportCSV(groupRecords)}
              className="flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 bg-green-500/20 text-green-300 border border-green-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
            >
              <Download className="w-3 h-3 mr-1.5" />
              CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-blue-400/20 shadow-inner bg-blue-900/40">
          <table className="w-full text-left text-sm text-blue-100">
            <thead className="bg-blue-800/80 text-blue-200 text-xs uppercase font-black border-b-2 border-blue-400/30">
              <tr>
                <th className="px-4 py-3 md:px-6 md:py-4">FECHA / HORA</th>
                <th className="px-4 py-3 md:px-6 md:py-4">TIPO</th>
                <th className="px-4 py-3 md:px-6 md:py-4">EMPLEADO</th>
                <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">LUGAR</th>
                <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">GPS</th>
                <th className="px-4 py-3 md:px-6 md:py-4 hidden sm:table-cell">ESTADO</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-center">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-400/10 bg-transparent">
              {recordsToRender.map((record, index) => {
                const date = new Date(record.timestamp);
                const isRetardo = record.type === 'ENTRADA' && (date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 15));
                
                return (
                  <tr key={record.id} className={`hover:bg-blue-800/50 transition-colors ${index % 2 === 0 ? 'bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <div className="font-bold text-white">{date.toLocaleDateString()}</div>
                      <div className="text-blue-300 text-[10px] md:text-xs">{date.toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-black border ${record.type === 'ENTRADA' ? 'bg-green-500/20 text-green-300 border-green-500/50' : 'bg-orange-500/20 text-orange-300 border-orange-500/50'}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <div className="font-bold text-white">{record.name}</div>
                      <div className="text-blue-300 text-[10px] md:text-xs font-bold">NÓMINA: {record.nominaNumber || 'N/A'}</div>
                      <div className="text-blue-200 font-bold text-[10px] sm:hidden mt-1">
                        {record.locationDescription} {record.delegacion ? `(${record.delegacion})` : ''}
                      </div>
                      <div className="sm:hidden mt-1">
                        {isRetardo ? (
                          <span className="flex items-center text-red-400 font-black text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> RETARDO
                          </span>
                        ) : (
                          <span className="text-green-400 font-black text-[10px]">A TIEMPO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-blue-200 font-bold text-xs md:text-sm hidden sm:table-cell">
                      {record.locationDescription} {record.delegacion ? `(${record.delegacion})` : ''}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap text-blue-200 text-[10px] md:text-xs hidden sm:table-cell">
                      {record.location ? (
                        <a 
                          href={`https://www.google.com/maps?q=${record.location.latitude},${record.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-300 hover:text-yellow-300 transition-colors"
                        >
                          Ver Mapa
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap hidden sm:table-cell">
                      {isRetardo ? (
                        <span className="flex items-center text-red-400 font-black text-[10px] md:text-xs">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> RETARDO
                        </span>
                      ) : (
                        <span className="text-green-400 font-black text-[10px] md:text-xs">A TIEMPO</span>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4 text-center">
                      <button
                        onClick={() => setConfirmDelete({ id: record.id, type: 'record' })}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white hover:scale-110 active:scale-95 transition-all duration-200"
                        title="ELIMINAR REGISTRO"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {isSingleGroup && groupRecords.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4 px-2">
            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">
              MOSTRANDO {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, groupRecords.length)} DE {groupRecords.length}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
              >
                ANTERIOR
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(groupRecords.length / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(groupRecords.length / itemsPerPage)}
                className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
              >
                SIGUIENTE
              </button>
            </div>
          </div>
        )}
      </div>
          );
        })}
        
        {!isSingleGroup && groupEntries.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4 px-6 mb-8">
            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">
              MOSTRANDO {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, groupEntries.length)} GRUPOS DE {groupEntries.length}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
              >
                ANTERIOR
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(groupEntries.length / itemsPerPage)))}
                disabled={currentPage >= Math.ceil(groupEntries.length / itemsPerPage)}
                className="px-3 py-1 bg-blue-800/50 text-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all duration-200 text-xs font-bold"
              >
                SIGUIENTE
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const buttonClasses = (active: boolean) => `
    flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 whitespace-nowrap shrink-0
    ${active 
      ? 'bg-yellow-400 text-blue-900 shadow-[0_4px_0_#b45309] translate-y-0 scale-105' 
      : 'bg-blue-800/60 text-blue-100 hover:bg-blue-700 hover:text-white shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#1e3a8a] active:shadow-none active:translate-y-[4px] active:scale-95'}
  `;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-7xl mx-auto bg-gradient-to-br from-blue-600 via-blue-800 to-blue-900 rounded-2xl md:rounded-3xl shadow-2xl border border-blue-400/30 min-h-[90vh] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 md:p-6 border-b border-blue-400/20 bg-blue-950/40 backdrop-blur-sm">
        <div className="mb-4 sm:mb-0 flex items-center">
          <Logo className="w-10 h-10 mr-3 drop-shadow-md" />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center tracking-widest drop-shadow-md uppercase">
              PANEL DE CONTROL
            </h1>
            <p className="text-blue-200 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-wide">ADMINISTRACIÓN DE REGISTROS DE ASISTENCIA</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setReportType('SHARE')}
            className="flex items-center px-4 py-2 bg-yellow-400 text-blue-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#b45309] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#b45309] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <Share2 className="w-4 h-4 mr-2" />
            COMPARTIR ENLACE
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_4px_0_#7f1d1d] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#7f1d1d] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4 mr-2" />
            SALIR
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 md:p-6 bg-blue-900/30 border-b border-blue-400/20 flex flex-col xl:flex-row gap-4 xl:gap-6 justify-between items-start xl:items-center">
        {/* Navigation Tabs - Scrollable on mobile */}
        <div className="flex overflow-x-auto pb-2 w-full xl:w-auto gap-3 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button onClick={() => setReportType('ALL')} className={`${buttonClasses(reportType === 'ALL')} whitespace-nowrap snap-start`}>
            <FileText className="w-4 h-4 mr-2" />
            TODOS
          </button>
          <button onClick={() => setReportType('EMPLOYEE')} className={`${buttonClasses(reportType === 'EMPLOYEE')} whitespace-nowrap snap-start`}>
            <Users className="w-4 h-4 mr-2" />
            POR EMPLEADO
          </button>
          <button onClick={() => setReportType('MONTH')} className={`${buttonClasses(reportType === 'MONTH')} whitespace-nowrap snap-start`}>
            <Calendar className="w-4 h-4 mr-2" />
            POR MES
          </button>
          <button onClick={() => setReportType('YEAR')} className={`${buttonClasses(reportType === 'YEAR')} whitespace-nowrap snap-start`}>
            <Calendar className="w-4 h-4 mr-2" />
            POR AÑO
          </button>
          <button onClick={() => setReportType('INCIDENCES')} className={`${buttonClasses(reportType === 'INCIDENCES')} whitespace-nowrap snap-start`}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            INCIDENCIAS
          </button>
          <button onClick={() => setReportType('EMPLOYEES_DB')} className={`${buttonClasses(reportType === 'EMPLOYEES_DB')} whitespace-nowrap snap-start`}>
            <Database className="w-4 h-4 mr-2" />
            EMPLEADOS
          </button>
          <button onClick={() => setReportType('COMPANY')} className={`${buttonClasses(reportType === 'COMPANY')} whitespace-nowrap snap-start`}>
            <Settings className="w-4 h-4 mr-2" />
            EMPRESA
          </button>
          <button onClick={() => setReportType('SHARE')} className={`${buttonClasses(reportType === 'SHARE')} whitespace-nowrap snap-start`}>
            <Share2 className="w-4 h-4 mr-2" />
            COMPARTIR
          </button>
          <button onClick={() => setReportType('SETTINGS')} className={`${buttonClasses(reportType === 'SETTINGS')} whitespace-nowrap snap-start`}>
            <Shield className="w-4 h-4 mr-2" />
            SEGURIDAD
          </button>
          <button onClick={() => setReportType('CUSTOMIZATION')} className={`${buttonClasses(reportType === 'CUSTOMIZATION')} whitespace-nowrap snap-start`}>
            <Palette className="w-4 h-4 mr-2" />
            PERSONALIZACIÓN
          </button>
        </div>

        {/* Dynamic Filters */}
        {reportType !== 'EMPLOYEES_DB' && reportType !== 'SETTINGS' && reportType !== 'COMPANY' && reportType !== 'SHARE' && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-blue-950/40 p-3 md:p-4 rounded-2xl border border-blue-400/20 w-full xl:w-auto">
            <div className="flex items-center text-yellow-400 pl-2 hidden md:flex">
              <Filter className="w-4 h-4" />
            </div>
            
            {(reportType === 'ALL' || reportType === 'INCIDENCES') && (
              <>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">DESDE:</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">HASTA:</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
              </>
            )}

            {reportType === 'EMPLOYEE' && (
              <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-20 md:w-auto">BUSCAR:</label>
                <input type="text" placeholder="NOMBRE O CAJA" value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all w-full md:w-48" />
              </div>
            )}

            {reportType === 'MONTH' && (
              <>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">DESDE:</label>
                  <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                  <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">HASTA:</label>
                  <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all" />
                </div>
              </>
            )}

            {reportType === 'YEAR' && (
              <div className="flex items-center space-x-2 w-full md:w-auto flex-1 xl:flex-none">
                <label className="text-blue-200 text-xs font-black uppercase tracking-wider w-16 md:w-auto">AÑO:</label>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="flex-1 md:flex-none px-3 py-2 border-b-2 border-blue-400 bg-white/10 rounded-lg text-sm text-white font-bold focus:border-yellow-400 focus:bg-white/20 outline-none transition-all">
                  {Array.from({length: 10}, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {(startDate || endDate || employeeSearch || startMonth || endMonth || selectedYear !== new Date().getFullYear().toString()) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setEmployeeSearch(''); setStartMonth(''); setEndMonth(''); setSelectedYear(new Date().getFullYear().toString()); }}
                className="flex items-center justify-center px-3 py-2 text-red-300 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 text-xs font-black uppercase tracking-wider w-full md:w-auto mt-2 md:mt-0"
                title="LIMPIAR FILTROS"
              >
                <XCircle className="w-4 h-4 md:mr-0 mr-2" />
                <span className="md:hidden">LIMPIAR FILTROS</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-grow bg-blue-950/30 overflow-y-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 gap-4">
          <h2 className="text-base md:text-lg font-black text-white uppercase tracking-widest drop-shadow-md flex items-center">
            {reportType === 'ALL' && 'TODOS LOS REGISTROS'}
            {reportType === 'EMPLOYEE' && 'REPORTE POR EMPLEADO'}
            {reportType === 'MONTH' && 'REPORTE MENSUAL'}
            {reportType === 'YEAR' && 'REPORTE ANUAL'}
            {reportType === 'INCIDENCES' && 'REPORTE DE INCIDENCIAS (RETARDOS)'}
            {reportType === 'EMPLOYEES_DB' && 'BASE DE DATOS DE EMPLEADOS'}
            {reportType === 'SETTINGS' && 'CONFIGURACIÓN DEL SISTEMA'}
          </h2>
          {reportType !== 'EMPLOYEES_DB' && reportType !== 'SETTINGS' && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => exportToGoogleSheets()}
                disabled={isExporting}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#1e3a8a] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#1e3a8a] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="w-4 h-4 mr-2" />
                )}
                GOOGLE SHEETS
              </button>
              <button
                onClick={() => exportCSV()}
                className="flex-1 md:flex-none flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#14532d] hover:translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_2px_0_#14532d] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-xs"
              >
                <Download className="w-4 h-4 mr-2" />
                EXPORTAR CSV GLOBAL
              </button>
            </div>
          )}
        </div>

        {renderGroupedRecords()}
      </div>

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col relative">
            <div className="bg-blue-900 p-4 flex justify-between items-center">
              <h3 className="text-white font-black uppercase tracking-widest">Vista Previa de Reporte</h3>
              <button 
                onClick={() => {
                  URL.revokeObjectURL(pdfPreviewUrl);
                  setPdfPreviewUrl(null);
                }}
                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <iframe 
              src={pdfPreviewUrl} 
              className="w-full flex-grow border-none"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-900 border-2 border-red-500/50 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-500/30">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">¿CONFIRMAR ELIMINACIÓN?</h3>
            <p className="text-blue-200 text-sm font-bold mb-6 uppercase">
              ESTA ACCIÓN NO SE PUEDE DESHACER. EL {confirmDelete.type === 'record' ? 'REGISTRO' : 'EMPLEADO'} SERÁ ELIMINADO PERMANENTEMENTE.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-blue-800 text-blue-100 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all duration-200 text-xs"
              >
                CANCELAR
              </button>
              <button 
                onClick={() => {
                  if (confirmDelete.type === 'record') handleDeleteRecord(confirmDelete.id);
                  else handleDeleteEmployee(confirmDelete.id);
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_4px_0_#7f1d1d] hover:translate-y-[2px] hover:scale-[1.02] active:translate-y-[4px] active:scale-95 active:shadow-none transition-all duration-200 text-xs"
              >
                ELIMINAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

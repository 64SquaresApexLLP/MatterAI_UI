// Imports.jsx
import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Paperclip, X, FileText, File, LogOut, User, Languages, Download, Eye, Loader2, CheckCircle, Upload, Bell, BellOff, Clock, AlertCircle, DownloadCloud, TrendingUp, AlertTriangle, Info, Globe, Copy, MessageCircle } from "lucide-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TimesheetForm from "./TimesheetForm";
import TimesheetEntries from "./TimesheetEntries";
import { useHomeLogic, notificationHelper, languages, formatFileSize } from "./HomeLogic";
import TimesheetOptions from "./TimesheetOptions";
import { Document, Page, pdfjs } from "react-pdf";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { renderAsync } from "docx-preview";
import { loadNotoCJK } from "./utils/loadNotoCJK";
import { previewCJKPdf } from "./utils/previewCJKPdf";
import docxPdf from 'docx-pdf';
import { Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';

export { React, useState, useRef, useEffect, Send, Mic, Paperclip, X, FileText, File, LogOut, User, Languages, Download, Eye, Loader2, CheckCircle, Upload, Bell, BellOff, Clock, AlertCircle, DownloadCloud, TrendingUp, AlertTriangle, Info, Globe, Copy, MessageCircle, ToastContainer, TimesheetForm, TimesheetEntries, useHomeLogic, notificationHelper, languages, formatFileSize, TimesheetOptions, Document, Page, pdfjs, pdfjsLib, renderAsync, loadNotoCJK, previewCJKPdf, docxPdf, Packer, Paragraph, TextRun, PDFDocument, rgb };
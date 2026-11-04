import type { NextPage } from 'next'

/* React */
import React, { useEffect, useState } from 'react'

/* Components */
import Head from 'next/head'
import Link from 'next/link'
import FileButton from '../components/FileButton'
import Image from 'next/image'
import Logo from '../public/img/logo-intergrupos-2026.jpg'
import DFLogo from '../public/img/df_logo.png'

/* Redux */
import { 
  setDropDepth, 
  setInDropZone, 
  setReduxParticipants,
} from "../redux/actions"
import { selectDropDepth } from "../redux/states/file/reducer"
import { useAppSelector, useAppDispatch } from '../redux/hooks'

/* Material UI */
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';

/* CSS */
import styles from '../styles/Home.module.css'

/* XLSX */
import readXlsxFile from 'read-excel-file'

/* Papaparse */
import Papa from "papaparse";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

type AnimationStyle = 'orbit' | 'pulse' | 'wave'
type RaffleSettings = { background: string; animation: AnimationStyle }
const defaultRaffleSettings: RaffleSettings = { background: '/img/torneo-intergrupos-2026-bienvenida.jpg', animation: 'orbit' }
const animationOptions: Array<{ id: AnimationStyle; name: string; description: string }> = [
  { id: 'orbit', name: 'Órbita neón', description: 'Versión más fluida y elegante del aro actual.' },
  { id: 'pulse', name: 'Pulso de sorteo', description: 'El aro respira y acelera para crear suspenso.' },
  { id: 'wave', name: 'Onda energética', description: 'Movimiento elástico y dinámico para un cierre festivo.' },
]



const Home: NextPage = () => {

  /* useState - upload */
  const [state, setState] = useState({
    fileName: "",
    loading: false,
    error: "",
    severity: "error",
    step: 0,
    open: false,
  });

  const [number, setNumber] = useState<number>(0);
  const [intervalID, setIntervalID] = useState<number>(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [raffleSettings, setRaffleSettings] = useState<RaffleSettings>(defaultRaffleSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('raffleSettings');
      if (saved) {
        const savedSettings = JSON.parse(saved) as RaffleSettings;
        // Migrate the former default background while retaining intentional custom choices.
        const background = savedSettings.background === '/img/background.png'
          ? defaultRaffleSettings.background
          : savedSettings.background;
        setRaffleSettings({ ...defaultRaffleSettings, ...savedSettings, background });
      }
    } catch { /* Use the defaults when browser storage is unavailable. */ }
  }, []);

  const updateRaffleSettings = (change: Partial<RaffleSettings>) => {
    setRaffleSettings((previous) => {
      const next = { ...previous, ...change };
      try { localStorage.setItem('raffleSettings', JSON.stringify(next)); } catch { /* Large uploads still work in this session. */ }
      return next;
    });
  };

  const uploadBackground = (event: React.ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    if (!image || !image.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updateRaffleSettings({ background: String(reader.result) });
    reader.readAsDataURL(image);
    event.target.value = '';
  };

   /* Redux */
  const dispatch = useAppDispatch(); //function that allows to trigger actions that update the redux state
  /* redux - file */
  const dropDepth = useAppSelector(selectDropDepth) //function that allows to get the dropDepth from the redux state

  /* Functions - handle drag and drop */
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch(setDropDepth(dropDepth + 1)); //increase drop depth
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dispatch(setDropDepth(dropDepth - 1)); //decrease drop depth
    if(dropDepth > 0) return //if drop depth is greater than 0, do nothing
    dispatch(setInDropZone(false)); //set in drop zone to false
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    e.dataTransfer.dropEffect = 'copy'; //allows drop
    dispatch(setInDropZone(true)); //set in drop zone to true
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    let files = e.dataTransfer.files; //get files
  
    if (files && files.length > 0) {
      
      var file = files[0];
      console.log('file: ', file);

      //validate file
      if(file.type !== 'text/csv') {
        const schema = {
          'nombre': {
            prop: 'nombre',
            type: String,
            required: true
          },
          'equipo': {
            prop: 'equipo',
            type: String,
            required: true
          },
          'apodo': {
            prop: 'apodo',
            type: String,
            required: true
          },
          'handicap': {
            prop: 'handicap',
            type: Number,
            required: true
          }

        }


        readXlsxFile(file, {schema}).then((rows) => {
          console.log('rows: ', rows);

          setState({
            ...state,
            fileName: file.name,
            error: "Archivo cargado correctamente",
            loading: true,
            open: true,
            severity: "success",
            step: 1
          });

          if(rows.rows.length > 0) {
            //@ts-ignore
            setParticipantsWithoutFile(rows.rows);
          }
          //return rows;
        }).catch((error) => {
          console.log('error: ', error);
          setState({
            ...state,
            error: 'Ocurrió un error al leer el archivo. Tiene que ser de tipo .CSV o .XLSX', 
            loading: false,
            open: true,
            severity: 'error'
          });
          return;
        });



        setState({
          ...state,
          error: 'Only CSV files are allowed',
          loading: false,
          open: true,
          severity: 'error'
        });
        console.log('error: ', 'Only CSV files are allowed');
        return;
      } else if(files.length > 1) {
        setState({
          ...state,
          error: 'Only one file is allowed',
          loading: false,
          open: true,
          severity: 'error'
        });
        console.log('error: ', 'Only one file is allowed');
        return;
      } else {
        e.dataTransfer.clearData(); //clear data
        dispatch(setDropDepth(0)); //reset drop depth to 0
        dispatch(setInDropZone(false)); //reset in drop zone to false

        setState({
          ...state,
          fileName: file.name,
          error: "",
          loading: true,
          open: false,
          severity: "success",
          step: 1
        });

        setParticipants(file);
      }
    }
  };

  /* Functions - handle file upload */
  const uploadFile = async(e:any) => {
    console.log(e.target.files[0]);

    let files = e.target.files; //get files
    var file = files[0];

    //validate file
    if(file.type !== 'text/csv') {
      const schema = {
        'nombre': {
          prop: 'nombre',
          type: String,
          required: true
        },
        'equipo': {
          prop: 'equipo',
          type: String,
          required: true
        },
        'apodo': {
          prop: 'apodo',
          type: String,
          required: true
        },
        'handicap': {
          prop: 'handicap',
          type: Number,
          required: true
        }

      }


      readXlsxFile(file, {schema}).then((rows) => {
        console.log('rows: ', rows);

        setState({
          ...state,
          fileName: file.name,
          error: "Archivo cargado correctamente",
          loading: true,
          open: true,
          severity: "success",
          step: 1
        });

        if(rows.rows.length > 0) {
          //@ts-ignore
          setParticipantsWithoutFile(rows.rows);
        }
        //return rows;
      }).catch((error) => {
        console.log('error: ', error);
        setState({
          ...state,
          error: 'Ocurrió un error al leer el archivo. Tiene que ser de tipo .CSV o .XLSX', 
          loading: false,
          open: true,
          severity: 'error'
        });
        return;
      });
      

      
    } else {

      setState({
        ...state,
        fileName: file.name,
        error: "Archivo cargado correctamente",
        loading: true,
        open: true,
        severity: "success",
        step: 1
      });

      setParticipants(file);
    }
  };

  

  /* Set participants data in redux */
  const setParticipants = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      //@ts-ignore
      complete: function (results) {
        console.log(results.data)

        //@ts-ignore
        dispatch(setReduxParticipants(results.data));

        let num = 0;

        const interval: any = setInterval(() => {
            if(num === results.data.length) {
              clearInterval(intervalID);
            } else {
              num = num + 1;
              setNumber(num);
            }

        }, 5)

        setIntervalID(interval);
      },
    });
  }

  /* Set participants without file */
  const setParticipantsWithoutFile = (participants: any) => {
    console.log('participants: ', participants);

    dispatch(setReduxParticipants(participants));

    let num = 0;

    const interval: any = setInterval(() => {
        if(num === participants.length) {
          clearInterval(intervalID);
        } else {
          num = num + 1;
          setNumber(num);
        }

    }, 10)

    setIntervalID(interval);
  }


  /* Alert messages functions */

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }

    setState({
      ...state,
      open: false,
      error: "",
    })
  };

  return (
    <div>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main} style={{ backgroundImage: `url("${raffleSettings.background}")` }}>
        <div className={styles.overlay}>

          <div className={styles.settingsButton}>
            <Tooltip title="Configuración de la rifa" placement="left">
              <IconButton aria-label="Abrir configuración de la rifa" onClick={() => setSettingsOpen(true)}>
                <SettingsRoundedIcon />
              </IconButton>
            </Tooltip>
          </div>

          {state.step === 0 ? (
                <div 
                  className={styles.upload__drop}
                  onDrop={e => handleDrop(e)}
                  onDragOver={e => handleDragOver(e)}
                  onDragEnter={e => handleDragEnter(e)}
                  onDragLeave={e => handleDragLeave(e)}
                >

                  {/* title */}
                  <div className={styles.margin__div}>
                    <h1 className={styles.title2}>ARRASTRA Y SUELTA</h1>
                    <p className={styles.text}>(.XLSX o .CSV)</p>
                  </div>

                  {/* icon */}
                  <div className={styles.margin__div}>
                    <FileUploadRoundedIcon className={styles.icon} />
                  </div>

                  {/* button */}
                  <div>
                    <FileButton uploadFile={uploadFile}/>
                  </div>

                  {/*  */}
                </div>
            ) : (
              <div className={styles.upload__drop}>

                {/* title */}
                <div className={styles.margin__div}>
                  <h1 className={styles.title2}>COMENZAR RIFA</h1>
                </div>

                {/* icon */}
                <div className={styles.icon__container}>
                  <PersonRoundedIcon className={styles.icon} />
                  <p>{number}</p>
                </div>

                {/* button */}
                <div>
                  <Link href="/raffle">
                    <button className={styles.start__button}><p>COMENZAR</p></button>
                  </Link>
                </div>

                {/*  */}
              </div>
          )}


          {/* Logo image */}
          <div className={styles.title__container}>
              <h1 className={styles.title}>TORNEO INTERGRUPOS 2026</h1>
              <div className={styles.logo__container}>
                  <Image src={Logo} width={150} height={150} alt="Logo Intergrupos 2026"/>
              </div>
          </div>

          {/* DFuture Logo image */}
          <div className={styles.df__logo__container}>
              {/* <p>Desarrollado por:</p> */}
              <Image src={DFLogo} width={500} height={160} alt="DFuture" objectFit='contain'/>
          </div>

          <Link href="/presentation" className={styles.presentationLink}>Presentación de bienvenida</Link>

        </div>
      </main>

      {/* alerts */}
       <Snackbar open={state.open} autoHideDuration={6000} onClose={handleClose}>

        <Alert onClose={handleClose} severity={state.severity === "error" ? "error" : "success"} sx={{ width: '100%' }}>
          {state.error}
        </Alert>
      </Snackbar>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="sm" aria-labelledby="raffle-settings-title">
        <DialogTitle id="raffle-settings-title">Configuración de la rifa</DialogTitle>
        <DialogContent dividers>
          <p className={styles.settingsLabel}>Fondo de pantalla</p>
          <div className={styles.backgroundChoices}>
            {['/img/torneo-intergrupos-2026-bienvenida.jpg', '/img/background.png', '/img/background_2.png', '/img/inter.png'].map((background, index) => (
              <button key={background} type="button" className={`${styles.backgroundChoice} ${raffleSettings.background === background ? styles.selectedChoice : ''}`} style={{ backgroundImage: `url(${background})` }} onClick={() => updateRaffleSettings({ background })} aria-label={`Elegir fondo ${index + 1}`} />
            ))}
          </div>
          <Button component="label" startIcon={<UploadRoundedIcon />} variant="outlined" size="small">Subir imagen propia<input hidden type="file" accept="image/*" onChange={uploadBackground} /></Button>
          <p className={styles.settingsLabel}>Animación del sorteo</p>
          <div className={styles.animationChoices}>
            {animationOptions.map((option) => (
              <button key={option.id} type="button" className={`${styles.animationChoice} ${raffleSettings.animation === option.id ? styles.selectedAnimation : ''}`} onClick={() => updateRaffleSettings({ animation: option.id })}>
                <strong>{option.name}</strong><span>{option.description}</span>
              </button>
            ))}
          </div>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)} variant="contained">Listo</Button></DialogActions>
      </Dialog>
    </div>
  )
}

export default Home

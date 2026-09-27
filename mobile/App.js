import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { CameraView, useCameraPermissions } from 'expo-camera'

const Stack = createNativeStackNavigator()
const API_URL = 'http://10.52.185.85:3000/api'
const TOKEN_KEY = 'warehouse_token'
const USER_KEY = 'warehouse_user'

async function api(path, options = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY)
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  })
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) throw new Error(data?.message || data || `HTTP ${response.status}`)
  return data
}

const colors = { bg: '#f4f7fb', card: '#ffffff', text: '#172033', muted: '#6b7280', primary: '#2563eb', border: '#e5e7eb', success: '#15803d', warning: '#b45309', danger: '#b91c1c' }

function Button({ title, onPress, variant = 'primary', disabled = false, small = false }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, small && styles.buttonSmall, variant === 'secondary' && styles.buttonSecondary, variant === 'danger' && styles.buttonDanger, variant === 'ghost' && styles.buttonGhost, disabled && styles.buttonDisabled, pressed && !disabled && styles.pressed]}><Text style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText, variant === 'ghost' && styles.buttonGhostText]}>{title}</Text></Pressable>
}

function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View> }
function Label({ children }) { return <Text style={styles.label}>{children}</Text> }
function Input({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) { return <View style={styles.field}><Label>{label}</Label><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9ca3af" keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && styles.textarea]} /></View> }
function Badge({ children, tone = 'neutral' }) { return <View style={[styles.badge, tone === 'success' && styles.badgeSuccess, tone === 'warning' && styles.badgeWarning, tone === 'danger' && styles.badgeDanger, tone === 'info' && styles.badgeInfo]}><Text style={styles.badgeText}>{children}</Text></View> }
function SectionTitle({ title, action, onAction }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={styles.link}>{action}</Text></Pressable> : null}</View> }

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit() {
    if (!username || !password) return Alert.alert('Login', 'Username dan password wajib diisi.')
    setLoading(true)
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
      await AsyncStorage.setItem(TOKEN_KEY, data.token)
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user))
      onLogin(data.user)
    } catch (e) { Alert.alert('Login gagal', e.message) } finally { setLoading(false) }
  }
  return <SafeAreaView style={styles.auth}><StatusBar style="dark"/><View style={styles.authCard}><View style={styles.brandMark}><Text style={styles.brandMarkText}>W</Text></View><Text style={styles.authTitle}>Warehouse Management</Text><Text style={styles.authSubtitle}>Mobile • fitur 1:1 dengan Web</Text><Input label="Username" value={username} onChangeText={setUsername} placeholder="Username"/><Input label="Password" value={password} onChangeText={setPassword} placeholder="Password"/><Button title={loading ? 'Memproses...' : 'Login'} onPress={submit} disabled={loading}/><Text style={styles.apiHint}>API: {API_URL}</Text></View></SafeAreaView>
}

function Dashboard({ user }) {
  const [pallets, setPallets] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    try {
      const data = await api('/pallets')
      setPallets(data.pallets || data || [])
    } catch (e) {
      Alert.alert('Dashboard', e.message)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalWeight = pallets.reduce((sum, p) => sum + Number(sumWeight(p.items)), 0).toFixed(2)
  const totalCarton = pallets.reduce((sum, p) => sum + (p.items || []).reduce((x, item) => x + Number(item.cartonQty || item.cartons || 0), 0), 0)
  const totalSku = pallets.reduce((sum, p) => sum + (p.items || []).length, 0)

  return (
    <Screen title="Inventory Management" subtitle={`Warehouse • ${user?.name || user?.username || 'User'}`} refresh={load} refreshing={refreshing}>
      <View style={styles.kpiGrid}>
        {[
          ['Total Pallet', pallets.length],
          ['Total Weight', `${totalWeight} Kg`],
          ['Total Carton', totalCarton],
          ['Total SKU', totalSku]
        ].map(([label, value]) => (
          <Card key={label} style={styles.kpi}>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.heroPanel}>
        <Text style={styles.eyebrow}>NEXT MILESTONE</Text>
        <Text style={styles.heroTitle}>Pallet Layout Designer</Text>
        <Text style={styles.heroText}>
          Denah pallet, level, posisi, dan perpindahan pallet tersedia di modul Pallet Layout dan Denah Gudang.
        </Text>
        <Text style={styles.heroProgress}>M1 → M2</Text>
      </Card>

      <SectionTitle title="Akses cepat" />
      <View style={styles.actionGrid}>
        <Quick title="Pallet" screen="Pallets" params={{ mode: 'master' }} />
        <Quick title="Pallet Layout" screen="PalletLayout" />
        <Quick title="Denah Gudang" screen="Warehouse" params={{ section: 'master' }} />
        <Quick title="Inbound" screen="Inbound" />
        <Quick title="Outbound" screen="Outbound" />
        <Quick title="Transaksi" screen="Transactions" params={{ section: 'inbound' }} />
        <Quick title="Manifest" screen="Manifests" params={{ section: 'grouping' }} />
      </View>
    </Screen>
  )
}
function Quick({ title, screen, params }) { const nav = useNavigation(); return <Pressable style={styles.quick} onPress={() => nav.navigate(screen, params)}><Text style={styles.quickText}>{title}</Text><Text style={styles.quickArrow}>›</Text></Pressable> }

function Drawer({ visible, onClose }) {
  const nav = useNavigation()
  const [expanded, setExpanded] = useState(null)

  const modules = [
    {
      key: 'pallet',
      label: 'Pallet',
      items: [
        ['Master Data Pallet', 'Pallets', { mode: 'master' }],
        ['Manajer Barang Dalam Palet', 'Pallets', { mode: 'manager' }],
        ['Barcode & SKU', 'Scanner', {}],
        ['Summary Fisik', 'Pallets', { mode: 'summary' }],
        ['Riwayat Posisi', 'Pallets', { mode: 'history' }]
      ]
    },
    {
      key: 'warehouse',
      label: 'Denah Gudang',
      items: [
        ['Master Denah Gudang', 'Warehouse', { section: 'master' }],
        ['Level & Slot Rak', 'Warehouse', { section: 'rack' }],
        ['Peta Slotting & Kapasitas', 'Warehouse', { section: 'slotting' }],
        ['Drag & Drop Movement', 'Warehouse', { section: 'movement' }],
        ['Distribusi Slot & FIFO', 'Warehouse', { section: 'fifo' }]
      ]
    },
    {
      key: 'transactions',
      label: 'Transaksi',
      items: [
        ['Gateway Inbound', 'Inbound', {}],
        ['Gateway Outbound', 'Outbound', {}],
        ['Dispatch Driver & Nopol', 'Transactions', { section: 'dispatch' }],
        ['Transaksi Draf', 'Transactions', { section: 'draft' }],
        ['Log & Riwayat', 'Transactions', { section: 'history' }]
      ]
    },
    {
      key: 'manifest',
      label: 'Manifest',
      items: [
        ['Grouping Armada', 'Manifests', { section: 'grouping' }],
        ['Rekonsiliasi', 'Manifests', { section: 'reconcile' }],
        ['Master Summary & Weight', 'Manifests', { section: 'weight' }],
        ['Breakdown Kemasan', 'Manifests', { section: 'packaging' }],
        ['Cetak & Export', 'Manifests', { section: 'export' }]
      ]
    }
  ]

  function go(screen, params = {}) {
    onClose()
    nav.navigate(screen, params)
  }

  if (!visible) return null

  return (
    <View style={styles.drawerOverlay}>
      <SafeAreaView style={styles.drawer}>
        <View style={styles.drawerHeader}>
          <View>
            <Text style={styles.drawerTitle}>Warehouse</Text>
            <Text style={styles.drawerSubtitle}>Management</Text>
          </View>
          <Pressable onPress={onClose} style={styles.drawerClose}>
            <Text style={styles.drawerCloseText}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.drawerContent}>
          <Pressable style={styles.drawerMainItem} onPress={() => go('Dashboard')}>
            <Text style={styles.drawerIcon}>⌂</Text>
            <Text style={styles.drawerMainText}>Dashboard</Text>
          </Pressable>

          {modules.map(module => (
            <View key={module.key}>
              <Pressable
                style={styles.drawerMainItem}
                onPress={() => setExpanded(expanded === module.key ? null : module.key)}
              >
                <Text style={styles.drawerIcon}>
                  {module.key === 'pallet' ? '▣' : module.key === 'warehouse' ? '⌂' : module.key === 'transactions' ? '↔' : '▤'}
                </Text>
                <Text style={styles.drawerMainText}>{module.label}</Text>
                <Text style={styles.drawerChevron}>{expanded === module.key ? '⌃' : '›'}</Text>
              </Pressable>

              {expanded === module.key ? (
                <View style={styles.drawerSubmenu}>
                  {module.items.map(([label, screen, params]) => (
                    <Pressable
                      key={label}
                      style={styles.drawerSubItem}
                      onPress={() => go(screen, params)}
                    >
                      <View style={styles.drawerSubDot} />
                      <Text style={styles.drawerSubText}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          <Pressable style={styles.drawerMainItem} onPress={() => go('PalletLayout')}>
            <Text style={styles.drawerIcon}>▦</Text>
            <Text style={styles.drawerMainText}>Pallet Layout</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <Pressable style={styles.drawerBackdrop} onPress={onClose} />
    </View>
  )
}

function Screen({ title, subtitle, children, refresh, refreshing = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => setDrawerOpen(true)}
          style={styles.menuButton}
          accessibilityLabel="Buka menu"
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          refresh
            ? <RefreshControl refreshing={refreshing} onRefresh={refresh} />
            : undefined
        }
      >
        {children}
      </ScrollView>

      <Drawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  )
}

function Pallets() {
  const nav = useNavigation()
  const route = useRoute()
  const mode = route.params?.mode || 'master'
  const [pallets, setPallets] = useState([])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(false)

  async function load() {
    try {
      const data = await api('/pallets')
      setPallets(data.pallets || data)
    } catch (e) {
      Alert.alert('Pallet', e.message)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = pallets.filter(p =>
    `${p.code || ''} ${palletName(p)}`
      .toLowerCase()
      .includes(query.toLowerCase())
  )

  const totalWeight = pallets.reduce((sum, p) => sum + Number(sumWeight(p.items)), 0).toFixed(2)
  const totalQty = pallets.reduce((sum, p) => sum + sumQty(p.items), 0)
  const placed = pallets.filter(p => p.locationStatus === 'placed').length
  const empty = pallets.filter(p => ['empty', 'unplaced'].includes(p.status || p.locationStatus)).length

  if (mode === 'summary') {
    return (
      <Screen title="Summary Fisik" subtitle="Ringkasan fisik seluruh pallet" refresh={load}>
        <View style={styles.kpiGrid}>
          {[
            ['Total Pallet', pallets.length],
            ['Terisi / Placed', placed],
            ['Empty / Unplaced', empty],
            ['Total Qty', totalQty],
            ['Total Berat', `${totalWeight} kg`]
          ].map(([label, value]) => (
            <Card key={label} style={styles.kpi}>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </Card>
          ))}
        </View>
        {pallets.map(p => (
          <Card key={p._id}>
            <View style={styles.listRow}>
              <View>
                <Text style={styles.rowTitle}>{p.code || p.palletCode || p.name || p._id}</Text>
                <Text style={styles.rowMeta}>{sumQty(p.items)} item • {sumWeight(p.items)} kg</Text>
              </View>
              <Badge tone={p.locationStatus === 'placed' ? 'success' : 'warning'}>
                {p.locationStatus || p.status || 'unplaced'}
              </Badge>
            </View>
          </Card>
        ))}
      </Screen>
    )
  }

  if (mode === 'manager') {
    return (
      <Screen title="Manajer Barang Dalam Palet" subtitle="Kelola item yang berada di setiap pallet" refresh={load}>
        <Input
          label="Cari pallet"
          value={query}
          onChangeText={setQuery}
          placeholder="P01, SKU, nama barang..."
        />
        {filtered.map(p => (
          <Card key={p._id}>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.code || p.palletCode || p.name || p._id}</Text>
                <Text style={styles.rowMeta}>
                  {p.items?.length || 0} SKU • {sumQty(p.items)} qty • {sumWeight(p.items)} kg
                </Text>
              </View>
              <Button
                title="Buka"
                small
                onPress={() => nav.navigate('PalletDetail', { palletId: p._id })}
              />
            </View>
          </Card>
        ))}
      </Screen>
    )
  }

  if (mode === 'history') {
    return (
      <Screen title="Riwayat Posisi" subtitle="Pilih pallet untuk melihat riwayat perpindahannya" refresh={load}>
        {filtered.map(p => (
          <Pressable key={p._id} onPress={() => nav.navigate('PalletDetail', { palletId: p._id })}>
            <Card>
              <View style={styles.listRow}>
                <View>
                  <Text style={styles.rowTitle}>{p.code || p.palletCode || p.name || p._id}</Text>
                  <Text style={styles.rowMeta}>Buka detail untuk melihat riwayat posisi</Text>
                </View>
                <Text style={styles.quickArrow}>›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </Screen>
    )
  }

  return (
    <Screen title="Master Data Pallet" subtitle="Validasi, item, barcode, summary & tracking" refresh={load}>
      <Input
        label="Cari pallet / item / SKU"
        value={query}
        onChangeText={setQuery}
        placeholder="P01, SKU, nama barang..."
      />
      <View style={styles.inlineButtons}>
        <Button title="+ Pallet" onPress={() => setModal(true)} small />
        <Button title="Scan Barcode" onPress={() => nav.navigate('Scanner')} variant="secondary" small />
      </View>

      {filtered.map(p => (
        <Pressable key={p._id} onPress={() => nav.navigate('PalletDetail', { palletId: p._id })}>
          <Card>
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.code || p.palletCode || p.name || p._id}</Text>
                <Text style={styles.rowMeta}>{palletName(p)} • {p.items?.length || 0} item</Text>
              </View>
              <Badge tone={p.locationStatus === 'placed' ? 'success' : 'warning'}>
                {p.locationStatus || p.status || 'unplaced'}
              </Badge>
            </View>
            <View style={styles.summaryLine}>
              <Text>Berat {sumWeight(p.items)} kg</Text>
              <Text>Qty {sumQty(p.items)}</Text>
            </View>
          </Card>
        </Pressable>
      ))}

      <PalletCreateModal
        visible={modal}
        onClose={() => setModal(false)}
        onSaved={load}
      />
    </Screen>
  )
}
function palletName(p) { return p.name || p.description || p.code || 'Pallet' }
function sumWeight(items = []) { return items.reduce((s, x) => s + Number(x.weight || 0), 0).toFixed(2) }
function sumQty(items = []) { return items.reduce((s, x) => s + Number(x.quantity || x.qty || 0), 0) }
function PalletCreateModal({ visible, onClose, onSaved }) { const [code, setCode] = useState(''); const [color, setColor] = useState('#4f7cff'); async function save() { try { await api('/pallets', { method: 'POST', body: JSON.stringify({ code, color }) }); onClose(); setCode(''); onSaved() } catch (e) { Alert.alert('Pallet', e.message) } } return <Modal visible={visible} transparent animationType="slide"><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Tambah Pallet</Text><Input label="Kode Pallet" value={code} onChangeText={setCode} placeholder="P01"/><Input label="Warna" value={color} onChangeText={setColor} placeholder="#4f7cff"/><View style={styles.inlineButtons}><Button title="Batal" onPress={onClose} variant="secondary"/><Button title="Simpan" onPress={save}/></View></View></View></Modal> }

function PalletDetail() { const { palletId } = useRoute().params; const [pallet, setPallet] = useState(null); const [history, setHistory] = useState([]); const [barcode, setBarcode] = useState(''); const [itemModal, setItemModal] = useState(false); const [item, setItem] = useState({ sku:'', name:'', itemType:'', packagingType:'Karton', quantity:'', weight:'' })
  async function load() { try { const p = await api(`/pallets/${palletId}`); setPallet(p.pallet || p); try { const h = await api(`/pallets/${palletId}/position-history`); setHistory(h.history || h) } catch {} } catch (e) { Alert.alert('Pallet Detail', e.message) } }
  useEffect(() => { load() }, [palletId])
  async function addItem() { try { await api(`/pallets/${palletId}/items`, { method:'POST', body: JSON.stringify({ ...item, quantity:Number(item.quantity||0), weight:Number(item.weight||0) }) }); setItemModal(false); setItem({sku:'',name:'',itemType:'',packagingType:'Karton',quantity:'',weight:''}); load() } catch(e){Alert.alert('Item',e.message)} }
  async function validate() { try { const d = await api('/pallets/validate-barcode',{method:'POST',body:JSON.stringify({palletId, barcode})}); Alert.alert('Barcode', d.message || 'Barcode valid'); load() } catch(e){Alert.alert('Barcode',e.message)} }
  if (!pallet) return <Screen title="Pallet"><Text>Memuat...</Text></Screen>
  const totalWeight=sumWeight(pallet.items), totalQty=sumQty(pallet.items), cartons=(pallet.items||[]).filter(x=>String(x.packagingType||x.packageType).toLowerCase()==='karton').reduce((s,x)=>s+Number(x.quantity||0),0), sacks=(pallet.items||[]).filter(x=>String(x.packagingType||x.packageType).toLowerCase()==='karung').reduce((s,x)=>s+Number(x.quantity||0),0)
  return <Screen title={pallet.code || 'Pallet Detail'} subtitle="Master data, item, barcode & tracking" refresh={load}><Card><View style={styles.listRow}><View><Text style={styles.rowTitle}>{pallet.code}</Text><Text style={styles.rowMeta}>{pallet.location?.warehouseName || 'Belum ditempatkan'}</Text></View><Badge tone={pallet.status==='occupied'?'success':'warning'}>{pallet.status || 'empty'}</Badge></View></Card><View style={styles.kpiGrid}>{[['Berat',`${totalWeight} kg`],['Qty',totalQty],['Karton',cartons],['Karung',sacks]].map(([l,v])=><Card key={l} style={styles.kpi}><Text style={styles.kpiValue}>{v}</Text><Text style={styles.kpiLabel}>{l}</Text></Card>)}</View><SectionTitle title="Barcode / SKU"/><Card><Input label="Barcode" value={barcode} onChangeText={setBarcode} placeholder="Scan / ketik barcode"/><Button title="Validasi Barcode" onPress={validate}/></Card><SectionTitle title="Barang dalam Pallet" action="+ Item" onAction={()=>setItemModal(true)}/>{(pallet.items||[]).map((x,i)=><Card key={x._id||i}><View style={styles.listRow}><View style={{flex:1}}><Text style={styles.rowTitle}>{x.name || x.sku || 'Item'}</Text><Text style={styles.rowMeta}>{x.sku || '-'} • {x.itemType || '-'} • {x.packagingType || '-'}</Text></View><Text style={styles.bold}>{x.quantity || 0}</Text></View><Text style={styles.rowMeta}>{x.weight || 0} kg</Text></Card>)}<SectionTitle title="Riwayat Posisi"/>{history.map((h,i)=><Card key={h._id||i}><Text style={styles.rowTitle}>{h.to?.warehouseName || h.to || 'Movement'}</Text><Text style={styles.rowMeta}>{h.movedAt ? new Date(h.movedAt).toLocaleString() : '-'} • {h.username || h.userId || '-'}</Text></Card>)}<Modal visible={itemModal} transparent animationType="slide"><View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}><View style={styles.modalCard}><Text style={styles.modalTitle}>Tambah Item</Text><Input label="SKU" value={item.sku} onChangeText={v=>setItem({...item,sku:v})} placeholder="SKU-001"/><Input label="Nama Barang" value={item.name} onChangeText={v=>setItem({...item,name:v})} placeholder="Frozen Food"/><Input label="Jenis Barang" value={item.itemType} onChangeText={v=>setItem({...item,itemType:v})} placeholder="Daging / Sayur / dll"/><Input label="Jenis Kemasan" value={item.packagingType} onChangeText={v=>setItem({...item,packagingType:v})} placeholder="Karton / Karung / Box"/><Input label="Quantity" value={item.quantity} onChangeText={v=>setItem({...item,quantity:v})} keyboardType="numeric"/><Input label="Weight (kg)" value={item.weight} onChangeText={v=>setItem({...item,weight:v})} keyboardType="decimal-pad"/><View style={styles.inlineButtons}><Button title="Batal" onPress={()=>setItemModal(false)} variant="secondary"/><Button title="Simpan" onPress={addItem}/></View></View></KeyboardAvoidingView></View></Modal></Screen>
}

function Warehouse() {
  const section = useRoute().params?.section || 'master'
  const [warehouses,setWarehouses]=useState([]), [slots,setSlots]=useState([]), [fifo,setFifo]=useState(null), [query,setQuery]=useState(''), [movement,setMovement]=useState({palletId:'',level:'1',slot:'1'}), [form,setForm]=useState({code:'',name:'',coldStorageCount:'2'})
  async function load(){try{const w=await api('/warehouses');setWarehouses(w.warehouses||w||[]);if(section==='slotting'){const d=await api('/warehouses/monitoring/slots');setSlots(d.slots||d||[])}if(section==='fifo')setFifo(await api('/warehouses/monitoring/fifo'))}catch(e){Alert.alert('Denah Gudang',e.message)}}
  useEffect(()=>{load()},[section])
  async function create(){try{await api('/warehouses',{method:'POST',body:JSON.stringify({...form,coldStorageCount:Number(form.coldStorageCount)})});setForm({code:'',name:'',coldStorageCount:'2'});Alert.alert('Gudang','Gudang berhasil dibuat');load()}catch(e){Alert.alert('Gudang',e.message)}}
  async function move(){if(!movement.palletId)return Alert.alert('Movement','Isi pallet ID.');try{await api('/warehouses/movement',{method:'POST',body:JSON.stringify({palletId:movement.palletId,to:{level:Number(movement.level),slot:Number(movement.slot)}})});Alert.alert('Movement','Pallet berhasil dipindahkan');load()}catch(e){Alert.alert('Movement',e.message)}}
  const filtered=slots.filter(x=>JSON.stringify(x).toLowerCase().includes(query.toLowerCase()))
  if(section==='movement')return <Screen title="Drag & Drop Movement" subtitle="Pilih level dan slot tujuan" refresh={load}><Card><Input label="Pallet ID" value={movement.palletId} onChangeText={v=>setMovement({...movement,palletId:v})} placeholder="Mongo ObjectId"/><Input label="Level" value={movement.level} onChangeText={v=>setMovement({...movement,level:v})} keyboardType="numeric"/><Input label="Slot" value={movement.slot} onChangeText={v=>setMovement({...movement,slot:v})} keyboardType="numeric"/><Button title="Pindahkan Pallet" onPress={move}/></Card></Screen>
  if(section==='slotting')return <Screen title="Peta Slotting & Kapasitas" subtitle="Monitoring posisi slot" refresh={load}><Input label="Cari slot / pallet / SKU" value={query} onChangeText={setQuery} placeholder="Search..."/>{filtered.map((x,i)=><Card key={x._id||i}><View style={styles.listRow}><View><Text style={styles.rowTitle}>{x.slotCode||`${x.rackCode||'Rack'} / L${x.level||1} / S${x.slot||1}`}</Text><Text style={styles.rowMeta}>{x.palletCode||'EMPTY'} • {x.warehouseName||'-'}</Text></View><Badge tone={x.status==='occupied'?'success':'info'}>{x.status||'empty'}</Badge></View></Card>)}</Screen>
  if(section==='fifo')return <Screen title="Distribusi Slot & FIFO" subtitle="Prioritas pallet dan warning" refresh={load}><SectionTitle title="Prioritas FIFO"/>{(fifo?.priority||[]).map((x,i)=><Card key={x._id||i}><Text style={styles.rowTitle}>{x.palletCode||x.palletId||`Pallet ${i+1}`}</Text><Text style={styles.rowMeta}>{x.slotCode||x.location||'-'}</Text></Card>)}<SectionTitle title="Warning"/>{(fifo?.warnings||[]).map((x,i)=><Card key={i}><Badge tone="warning">WARNING</Badge><Text style={[styles.rowTitle,{marginTop:7}]}>{x.message||x.warning||String(x)}</Text></Card>)}</Screen>
  if(section==='rack')return <Screen title="Level & Slot Rak" subtitle="Rack, level dan slot" refresh={load}>{warehouses.map(w=><Card key={w._id}><Text style={styles.rowTitle}>{w.code} — {w.name}</Text>{(w.coldStorages||[]).map(c=><View key={c._id} style={{marginTop:10}}><Text style={styles.rowTitle}>{c.code} — {c.name}</Text>{(c.racks||[]).map(r=><View key={r._id} style={styles.slotRow}><Text style={styles.rowMeta}>{r.code} • {r.levels?.length||0} level</Text><Text style={styles.rowMeta}>{(r.levels||[]).reduce((n,l)=>n+(l.slots?.length||0),0)} slot</Text></View>)}</View>)}</Card>)}</Screen>
  return <Screen title="Master Denah Gudang" subtitle="Gudang dan area" refresh={load}><Card><Text style={styles.rowTitle}>Tambah Gudang</Text><Input label="Kode" value={form.code} onChangeText={v=>setForm({...form,code:v})} placeholder="G01"/><Input label="Nama" value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="Cold Storage Utama"/><Input label="Cold Storage" value={form.coldStorageCount} onChangeText={v=>setForm({...form,coldStorageCount:v})} keyboardType="numeric"/><Button title="Tambah Gudang" onPress={create}/></Card>{warehouses.map(w=><Card key={w._id}><Text style={styles.rowTitle}>{w.code} — {w.name}</Text><Text style={styles.rowMeta}>{w.coldStorages?.length||0} cold storage • {w.areas?.length||0} area</Text></Card>)}</Screen>
}


function Transactions({ type='all' }) {
  const section=useRoute().params?.section || (type==='outbound'?'outbound':'inbound'); const [pallets,setPallets]=useState([]),[drafts,setDrafts]=useState([]),[logs,setLogs]=useState([]); const [form,setForm]=useState({type:section==='outbound'?'outbound':'inbound',palletId:'',driverName:'',nopol:'',sku:'',itemName:'',itemType:'',barcode:'',packaging:'Karton',packageQty:'0',cartonQty:'0',sackQty:'0',boxQty:'0',weightKg:'0',itemId:''}); const [selected,setSelected]=useState(null)
  async function load(){try{const [p,d,l]=await Promise.all([api('/pallets'),api('/transactions/drafts'),api('/transactions/logs')]);setPallets(p.pallets||p||[]);setDrafts(d.drafts||d||[]);setLogs(l.logs||l||[])}catch(e){Alert.alert('Transaksi',e.message)}} useEffect(()=>{load()},[section]); function sf(k,v){setForm(x=>({...x,[k]:v}))} function pick(id){const p=pallets.find(x=>String(x._id)===String(id));setSelected(p);sf('palletId',id)} function item(id){const x=selected?.items?.find(i=>String(i._id||i.id)===String(id));if(x)setForm(f=>({...f,itemId:x._id||x.id,sku:x.sku||'',itemName:x.itemName||x.name||'',itemType:x.itemType||'',barcode:x.barcode||'',packaging:x.packaging||x.packagingType||'Karton'}))}
  async function submit(mode){try{const payload={type:form.type,palletId:form.palletId,driverName:form.driverName,nopol:form.nopol,items:[{selected:true,itemId:form.itemId||null,sku:form.sku,itemName:form.itemName,itemType:form.itemType,barcode:form.barcode,packaging:form.packaging,packageQty:Number(form.packageQty||0),cartonQty:Number(form.cartonQty||0),sackQty:Number(form.sackQty||0),boxQty:Number(form.boxQty||0),weightKg:Number(form.weightKg||0)}]};const v=await api('/transactions/validate',{method:'POST',body:JSON.stringify(payload)});if(!v.valid)throw new Error(v.message||'Checklist transaksi tidak valid');await api(mode==='draft'?'/transactions/drafts':'/transactions',{method:'POST',body:JSON.stringify(payload)});Alert.alert('Transaksi',mode==='draft'?'Draft tersimpan.':'Transaksi terkonfirmasi.');load()}catch(e){Alert.alert('Transaksi',e.message)}}
  async function verify(id){try{await api(`/transactions/drafts/${id}/verify`,{method:'PUT',body:JSON.stringify({note:'Diverifikasi dari mobile'})});load()}catch(e){Alert.alert('Draft',e.message)}} async function reject(id){try{await api(`/transactions/drafts/${id}/reject`,{method:'PUT',body:JSON.stringify({note:'Ditolak dari mobile'})});load()}catch(e){Alert.alert('Draft',e.message)}}
  if(section==='draft')return <Screen title="Transaksi Draf" subtitle="Pending verification" refresh={load}>{drafts.map((d,i)=><Card key={d._id||d.id||i}><Text style={styles.rowTitle}>{d.id||d._id}</Text><Text style={styles.rowMeta}>{d.type} • {d.palletId} • {d.driverName} • {d.nopol}</Text><View style={styles.inlineButtons}><Button title="Verifikasi" onPress={()=>verify(d.id||d._id)} small/><Button title="Tolak" onPress={()=>reject(d.id||d._id)} small variant="danger"/></View></Card>)}</Screen>
  if(section==='history')return <Screen title="Log & Riwayat" subtitle="Audit aktivitas transaksi" refresh={load}>{logs.map((l,i)=><Card key={l._id||i}><Text style={styles.rowTitle}>{l.transactionId||'-'} • {l.action||'-'}</Text><Text style={styles.rowMeta}>{l.username||'-'} • {l.status||'-'}</Text><Text style={styles.rowMeta}>{l.message||'-'}</Text></Card>)}</Screen>
  if(section==='dispatch')return <Screen title="Dispatch Driver & Nopol" subtitle="Validasi kendaraan"><Card><Input label="Nama Driver" value={form.driverName} onChangeText={v=>sf('driverName',v)} placeholder="Budi"/><Input label="Nopol Armada" value={form.nopol} onChangeText={v=>sf('nopol',v.toUpperCase())} placeholder="B 1234 XYZ"/><Input label="Pallet ID" value={form.palletId} onChangeText={v=>sf('palletId',v)} placeholder="Mongo ObjectId"/><Button title="Simpan Draft" onPress={()=>submit('draft')}/></Card></Screen>
  const out=section==='outbound'||type==='outbound'; return <Screen title={out?'Gateway Outbound':'Gateway Inbound'} subtitle="Checklist, driver/nopol dan item" refresh={load}><Card><Input label="Nama Driver" value={form.driverName} onChangeText={v=>sf('driverName',v)} placeholder="Budi"/><Input label="Nopol Armada" value={form.nopol} onChangeText={v=>sf('nopol',v.toUpperCase())} placeholder="B 1234 XYZ"/><SectionTitle title="Pilih Pallet"/>{pallets.map(p=><Pressable key={p._id} onPress={()=>pick(p._id)}><Card style={String(selected?._id)===String(p._id)?styles.selectedCard:undefined}><Text style={styles.rowTitle}>{p.code||p.name||p._id}</Text><Text style={styles.rowMeta}>{p.items?.length||0} SKU</Text></Card></Pressable>)}{out&&selected?<><SectionTitle title="Pilih Item"/>{(selected.items||[]).map(i=><Pressable key={i._id||i.id} onPress={()=>item(i._id||i.id)}><Card><Text style={styles.rowTitle}>{i.sku} — {i.itemName||i.name}</Text></Card></Pressable>)}</>:null}<Input label="SKU" value={form.sku} onChangeText={v=>sf('sku',v)} placeholder="SKU-001"/><Input label="Nama Barang" value={form.itemName} onChangeText={v=>sf('itemName',v)} placeholder="Frozen Food"/><Input label="Jenis Barang" value={form.itemType} onChangeText={v=>sf('itemType',v)} placeholder="Daging / Sayur"/><Input label="Barcode" value={form.barcode} onChangeText={v=>sf('barcode',v)} placeholder="Barcode"/><Input label="Kemasan" value={form.packaging} onChangeText={v=>sf('packaging',v)} placeholder="Karton"/><Input label="Kemasan/Unit" value={form.packageQty} onChangeText={v=>sf('packageQty',v)} keyboardType="numeric"/><Input label="Karton" value={form.cartonQty} onChangeText={v=>sf('cartonQty',v)} keyboardType="numeric"/><Input label="Karung" value={form.sackQty} onChangeText={v=>sf('sackQty',v)} keyboardType="numeric"/><Input label="Box" value={form.boxQty} onChangeText={v=>sf('boxQty',v)} keyboardType="numeric"/><Input label="Weight (kg)" value={form.weightKg} onChangeText={v=>sf('weightKg',v)} keyboardType="decimal-pad"/><View style={styles.inlineButtons}><Button title="Simpan Draft" onPress={()=>submit('draft')} variant="secondary"/><Button title="Konfirmasi" onPress={()=>submit('confirmed')}/></View></Card></Screen>
}


function Manifests() {
 const section=useRoute().params?.section||'grouping';const [manifests,setManifests]=useState([]);async function load(){try{const d=await api('/manifests');setManifests(d.manifests||d||[])}catch(e){Alert.alert('Manifest',e.message)}}useEffect(()=>{load()},[]);async function generate(){try{await api('/manifests/generate',{method:'POST',body:JSON.stringify({})});Alert.alert('Manifest','Grouping berhasil dibuat.');load()}catch(e){Alert.alert('Manifest',e.message)}}async function reconcile(id){try{await api(`/manifests/${id}/reconcile`,{method:'PUT',body:JSON.stringify({status:'reconciled'})});load()}catch(e){Alert.alert('Manifest',e.message)}}const sorted=[...manifests].sort((a,b)=>Number(b.totalWeight||0)-Number(a.totalWeight||0));const weight=manifests.reduce((s,x)=>s+Number(x.totalWeight||0),0);const cartons=manifests.reduce((s,x)=>s+Number(x.totalCartons||x.cartons||0),0);const sacks=manifests.reduce((s,x)=>s+Number(x.totalSacks||x.sacks||0),0);const boxes=manifests.reduce((s,x)=>s+Number(x.totalBoxes||x.boxes||0),0);if(section==='reconcile')return <Screen title="Rekonsiliasi" subtitle="Verifikasi manifest" refresh={load}>{manifests.map((m,i)=><Card key={m._id||i}><Text style={styles.rowTitle}>{m.id||m.manifestCode||`Manifest ${i+1}`}</Text><Text style={styles.rowMeta}>{m.driverName||'-'} • {m.nopol||'-'} • {m.status||'pending'}</Text>{m.status!=='reconciled'&&<Button title="Rekonsiliasi" onPress={()=>reconcile(m._id||m.id)} small variant="secondary"/>}</Card>)}</Screen>;if(section==='weight')return <Screen title="Master Summary & Weight" subtitle="Urutan berdasarkan berat" refresh={load}><View style={styles.kpiGrid}>{[['Manifest',manifests.length],['Berat',`${weight.toFixed(2)} kg`],['Karton',cartons],['Kemasan',cartons+sacks+boxes]].map(([l,v])=><Card key={l} style={styles.kpi}><Text style={styles.kpiValue}>{v}</Text><Text style={styles.kpiLabel}>{l}</Text></Card>)}</View>{sorted.map((m,i)=><Card key={m._id||i}><Text style={styles.rowTitle}>{i+1}. {m.id||m.manifestCode||`Manifest ${i+1}`}</Text><Text style={styles.rowMeta}>{m.driverName||'-'} • {m.nopol||'-'} • {Number(m.totalWeight||0).toFixed(2)} kg</Text></Card>)}</Screen>;if(section==='packaging')return <Screen title="Breakdown Kemasan" subtitle="Karton, karung dan box" refresh={load}><View style={styles.kpiGrid}>{[['Karton',cartons],['Karung',sacks],['Box',boxes],['Berat',`${weight.toFixed(2)} kg`]].map(([l,v])=><Card key={l} style={styles.kpi}><Text style={styles.kpiValue}>{v}</Text><Text style={styles.kpiLabel}>{l}</Text></Card>)}</View>{sorted.map((m,i)=><Card key={m._id||i}><Text style={styles.rowTitle}>{m.id||m.manifestCode||`Manifest ${i+1}`}</Text><Text style={styles.rowMeta}>Karton {m.totalCartons||m.cartons||0} • Karung {m.totalSacks||m.sacks||0} • Box {m.totalBoxes||m.boxes||0}</Text></Card>)}</Screen>;if(section==='export')return <Screen title="Cetak & Export" subtitle="Ringkasan manifest" refresh={load}><Card><Text style={styles.rowTitle}>Export CSV</Text><Text style={styles.rowMeta}>Endpoint export backend tetap tersedia dan data di bawah adalah data manifest yang sama.</Text></Card>{sorted.map((m,i)=><Card key={m._id||i}><Text style={styles.rowTitle}>{m.id||m.manifestCode||`Manifest ${i+1}`}</Text><Text style={styles.rowMeta}>{m.driverName||'-'} • {m.nopol||'-'} • {Number(m.totalWeight||0).toFixed(2)} kg</Text></Card>)}</Screen>;return <Screen title="Grouping Armada" subtitle="Grouping, reconciliation, weight sorting & packaging" refresh={load}><Button title="Generate Manifest" onPress={generate}/>{sorted.length===0?<Card><Text style={styles.rowTitle}>Belum ada manifest</Text><Text style={styles.rowMeta}>Klik Generate Manifest setelah transaksi confirmed.</Text></Card>:sorted.map((m,i)=><Card key={m._id||i}><Text style={styles.rowTitle}>{m.id||m.manifestCode||`Manifest ${i+1}`}</Text><Text style={styles.rowMeta}>Driver: {m.driverName||'-'} • Nopol: {m.nopol||'-'}</Text><View style={styles.summaryLine}><Text>{Number(m.totalWeight||0).toFixed(2)} kg</Text><Text>{m.transactionsCount||0} transaksi</Text></View><Button title="Rekonsiliasi" onPress={()=>reconcile(m._id||m.id)} small variant="secondary"/></Card>)}</Screen>
}


function PalletLayout() { const [layouts,setLayouts]=useState([]); const [selected,setSelected]=useState(null); async function load(){try{const d=await api('/layouts');setLayouts(d.layouts||d)}catch(e){Alert.alert('Pallet Layout',e.message)}} useEffect(()=>{load()},[]); return <Screen title="Pallet Layout" subtitle="Desktop drag-drop equivalent: tap to select, then move"><SectionTitle title="Layout"/>{layouts.map((l,i)=><Pressable key={l._id||i} onPress={()=>setSelected(l)}><Card><View style={styles.listRow}><View><Text style={styles.rowTitle}>{l.name || `Layout ${i+1}`}</Text><Text style={styles.rowMeta}>{l.orientation || 'horizontal'} • {l.fifoDirection || 'FIFO'}</Text></View><Badge tone={selected?._id===l._id?'info':'neutral'}>{selected?._id===l._id?'Dipilih':'Pilih'}</Badge></View></Card></Pressable>)}<Card><Text style={styles.rowTitle}>Interaksi mobile</Text><Text style={styles.rowMeta}>Pilih pallet pada layout, pilih slot tujuan, lalu konfirmasi movement. Fungsi perpindahan tetap sama dengan desktop, tetapi tidak mengandalkan drag gesture.</Text></Card></Screen> }

function Scanner() { const [permission,requestPermission]=useCameraPermissions(); const nav=useNavigation(); const [scanned,setScanned]=useState(false); if(!permission) return <Screen title="Scanner"><Text>Memuat kamera...</Text></Screen>; if(!permission.granted) return <Screen title="Scanner"><Text style={styles.rowMeta}>Kamera diperlukan untuk scan barcode.</Text><Button title="Izinkan Kamera" onPress={requestPermission}/></Screen>; return <SafeAreaView style={styles.scanner}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{barcodeTypes:['qr','code128','code39','ean13','ean8','upc_a','upc_e']}} onBarcodeScanned={scanned?undefined:({data})=>{setScanned(true);Alert.alert('Barcode terbaca',data,[{text:'Gunakan',onPress:()=>nav.navigate('Pallets')},{text:'Scan lagi',onPress:()=>setScanned(false)}])}}/><View style={styles.scanFrame}><View style={styles.scanBox}/><Text style={styles.scanText}>Arahkan barcode ke dalam kotak</Text></View></SafeAreaView> }

function Menu({ user, onLogout }) { const nav=useNavigation(); const items=[['Dashboard','Dashboard'],['Pallet','Pallets'],['Pallet Layout','PalletLayout'],['Denah Gudang','Warehouse'],['Inbound','Inbound'],['Outbound','Outbound'],['Transaksi','Transactions'],['Manifest','Manifests']]; return <Screen title="Menu" subtitle={user?.name || user?.username}><Card>{items.map(([label,screen])=><Pressable key={screen} onPress={()=>nav.navigate(screen)} style={styles.menuRow}><Text style={styles.menuText}>{label}</Text><Text style={styles.quickArrow}>›</Text></Pressable>)}</Card><Button title="Logout" onPress={onLogout} variant="danger"/></Screen> }

function RootTabs({ user, onLogout }) { const nav=useNavigation(); return <Screen title="Warehouse Management" subtitle="Mobile • Web feature parity"><Card><Text style={styles.rowTitle}>Fitur 1:1</Text><Text style={styles.rowMeta}>Semua modul Web tersedia di Mobile. Gunakan Menu untuk mengakses fitur lengkap.</Text></Card><View style={styles.bottomGrid}><Quick title="Dashboard" screen="Dashboard"/><Quick title="Pallet" screen="Pallets"/><Quick title="Denah" screen="Warehouse"/><Quick title="Inbound" screen="Inbound"/><Quick title="Outbound" screen="Outbound"/><Quick title="Menu" screen="Menu"/></View></Screen> }

function AppNavigator({ user, onLogout }) { return <NavigationContainer><Stack.Navigator screenOptions={{headerShown:false}}><Stack.Screen name="Dashboard">{()=><Dashboard user={user}/>}</Stack.Screen><Stack.Screen name="Home">{()=><RootTabs user={user} onLogout={onLogout}/>}</Stack.Screen><Stack.Screen name="Menu">{()=><Menu user={user} onLogout={onLogout}/>}</Stack.Screen><Stack.Screen name="Pallets" component={Pallets}/><Stack.Screen name="PalletDetail" component={PalletDetail}/><Stack.Screen name="PalletLayout" component={PalletLayout}/><Stack.Screen name="Warehouse" component={Warehouse}/><Stack.Screen name="Inbound">{()=><Transactions type="inbound"/>}</Stack.Screen><Stack.Screen name="Outbound">{()=><Transactions type="outbound"/>}</Stack.Screen><Stack.Screen name="Transactions" component={Transactions}/><Stack.Screen name="Manifests" component={Manifests}/><Stack.Screen name="Scanner" component={Scanner}/></Stack.Navigator></NavigationContainer> }

export default function App() { const [user,setUser]=useState(null); const [loading,setLoading]=useState(true); useEffect(()=>{AsyncStorage.getItem(USER_KEY).then(v=>{if(v)try{setUser(JSON.parse(v))}catch{}}).finally(()=>setLoading(false))},[]); async function logout(){try{await api('/auth/logout',{method:'POST'})}catch{} await AsyncStorage.multiRemove([TOKEN_KEY,USER_KEY]);setUser(null)} if(loading)return <SafeAreaView style={styles.safe}><Text style={styles.loading}>Memuat...</Text></SafeAreaView>; if(!user)return <Login onLogin={setUser}/>; return <AppNavigator user={user} onLogout={logout}/> }

const styles=StyleSheet.create({
  drawerOverlay:{position:'absolute',top:0,bottom:0,left:0,right:0,zIndex:100,elevation:100,flexDirection:'row'},
  drawerBackdrop:{flex:1,backgroundColor:'rgba(15,23,42,.45)'},
  drawer:{width:'84%',maxWidth:340,backgroundColor:'#fff',alignSelf:'flex-start',elevation:16,shadowColor:'#000',shadowOpacity:.18,shadowRadius:12,shadowOffset:{width:3,height:0}},
  drawerHeader:{paddingHorizontal:20,paddingVertical:18,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  drawerTitle:{fontSize:21,fontWeight:'900',color:colors.text},
  drawerSubtitle:{fontSize:12,color:colors.muted,marginTop:2},
  drawerClose:{width:40,height:40,borderRadius:20,backgroundColor:'#f1f5f9',alignItems:'center',justifyContent:'center'},
  drawerCloseText:{fontSize:27,lineHeight:30,color:colors.text},
  drawerContent:{padding:12,paddingBottom:30},
  drawerMainItem:{minHeight:52,borderRadius:12,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10},
  drawerMainText:{flex:1,fontSize:15,fontWeight:'800',color:colors.text},
  drawerIcon:{width:25,textAlign:'center',fontSize:18,color:colors.primary},
  drawerChevron:{fontSize:22,color:colors.muted},
  drawerSubmenu:{marginLeft:37,marginBottom:7,borderLeftWidth:2,borderLeftColor:'#dbeafe',paddingLeft:5},
  drawerSubItem:{minHeight:44,paddingHorizontal:10,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:9,borderRadius:10},
  drawerSubDot:{width:6,height:6,borderRadius:3,backgroundColor:colors.primary},
  drawerSubText:{flex:1,fontSize:13,color:colors.muted,fontWeight:'600'},
  menuButton:{width:40,height:40,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:10,backgroundColor:'#f1f5f9'},
  hamburgerLine:{width:20,height:2.5,borderRadius:2,backgroundColor:colors.text,marginVertical:2},
  headerText:{flex:1},
  safe:{flex:1,backgroundColor:colors.bg},content:{padding:16,paddingBottom:36},header:{paddingHorizontal:16,paddingTop:10,paddingBottom:12,backgroundColor:colors.card,borderBottomWidth:1,borderBottomColor:colors.border},headerTitle:{fontSize:23,fontWeight:'800',color:colors.text},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1,color:colors.primary},heroPanel:{padding:18},heroTitle:{fontSize:22,fontWeight:'900',color:colors.text,marginTop:7},heroText:{fontSize:13,color:colors.muted,lineHeight:20,marginTop:7},heroProgress:{alignSelf:'flex-start',marginTop:14,paddingHorizontal:12,paddingVertical:7,borderRadius:10,backgroundColor:'#dbeafe',color:colors.primary,fontWeight:'900'},headerSubtitle:{marginTop:3,color:colors.muted,fontSize:13},card:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:14,marginBottom:12},kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:12},kpi:{width:'47%',marginBottom:0},kpiValue:{fontSize:22,fontWeight:'800',color:colors.text},kpiLabel:{marginTop:4,color:colors.muted,fontSize:12},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:6,marginBottom:9},sectionTitle:{fontSize:16,fontWeight:'800',color:colors.text},link:{color:colors.primary,fontWeight:'700'},field:{marginBottom:12},label:{fontSize:12,fontWeight:'700',color:colors.muted,marginBottom:6},input:{backgroundColor:'#f9fafb',borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:13,paddingVertical:11,color:colors.text,fontSize:15},textarea:{minHeight:90,textAlignVertical:'top'},button:{backgroundColor:colors.primary,borderRadius:12,paddingVertical:13,paddingHorizontal:16,alignItems:'center',justifyContent:'center',minHeight:46,flex:1},buttonSmall:{minHeight:40,paddingVertical:10,flex:0},buttonSecondary:{backgroundColor:'#eef2f7'},buttonDanger:{backgroundColor:colors.danger},buttonGhost:{backgroundColor:'transparent'},buttonDisabled:{opacity:.5},buttonText:{color:'#fff',fontWeight:'800'},buttonSecondaryText:{color:colors.text},buttonGhostText:{color:colors.primary},pressed:{opacity:.78},inlineButtons:{flexDirection:'row',gap:10,marginBottom:12},listRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},rowTitle:{fontSize:15,fontWeight:'800',color:colors.text},rowMeta:{fontSize:12,color:colors.muted,marginTop:4},summaryLine:{flexDirection:'row',justifyContent:'space-between',marginTop:12,paddingTop:10,borderTopWidth:1,borderTopColor:colors.border,color:colors.muted},bold:{fontWeight:'800',color:colors.text},badge:{paddingHorizontal:9,paddingVertical:5,borderRadius:999,backgroundColor:'#eef2f7'},badgeSuccess:{backgroundColor:'#dcfce7'},badgeWarning:{backgroundColor:'#fef3c7'},badgeDanger:{backgroundColor:'#fee2e2'},badgeInfo:{backgroundColor:'#dbeafe'},selectedCard:{borderColor:colors.primary,borderWidth:2},slotRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderTopWidth:1,borderTopColor:colors.border},badgeText:{fontSize:11,fontWeight:'800',color:colors.text},quick:{flex:1,minWidth:'47%',backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},quickText:{fontWeight:'800',color:colors.text},quickArrow:{fontSize:23,color:colors.primary},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},auth:{flex:1,backgroundColor:colors.bg,justifyContent:'center',padding:20},authCard:{backgroundColor:colors.card,borderRadius:22,borderWidth:1,borderColor:colors.border,padding:20},brandMark:{width:48,height:48,borderRadius:14,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',marginBottom:14},brandMarkText:{color:'#fff',fontSize:23,fontWeight:'900'},authTitle:{fontSize:24,fontWeight:'900',color:colors.text},authSubtitle:{color:colors.muted,marginBottom:20,marginTop:4},apiHint:{fontSize:10,color:'#9ca3af',marginTop:12},modalBackdrop:{flex:1,backgroundColor:'rgba(15,23,42,.45)',justifyContent:'flex-end'},modalCard:{backgroundColor:'#fff',borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:'90%'},modalTitle:{fontSize:20,fontWeight:'900',color:colors.text,marginBottom:14},menuRow:{paddingVertical:16,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},menuText:{fontSize:16,fontWeight:'700',color:colors.text},bottomGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},loading:{margin:20,fontSize:16,color:colors.muted},scanner:{flex:1,backgroundColor:'#000',justifyContent:'center',alignItems:'center'},scanFrame:{alignItems:'center'},scanBox:{width:260,height:180,borderWidth:3,borderColor:'#fff',borderRadius:20},scanText:{color:'#fff',fontWeight:'700',marginTop:18}});

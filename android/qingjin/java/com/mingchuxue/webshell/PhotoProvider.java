package com.mingchuxue.webshell;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.UUID;

/** 只共享本App photo-upload 缓存中随机命名的单个文件；从不暴露任意路径。 */
public final class PhotoProvider extends ContentProvider {
    static File directory(Context c) { File d=new File(c.getCacheDir(),"photo-upload");d.mkdirs();return d; }
    static File newFile(Context c,String ext)throws IOException { if(!ext.matches("jpg|png|webp|json"))throw new IOException("bad type");File f=new File(directory(c),UUID.randomUUID()+"."+ext);if(!f.createNewFile())throw new IOException("create failed");return f; }
    static Uri uri(Context c,File f){return new Uri.Builder().scheme("content").authority(c.getPackageName()+".photos").appendPath(f.getName()).build();}
    static File file(Context c,Uri u)throws IOException {if(!"content".equals(u.getScheme())||!(c.getPackageName()+".photos").equals(u.getAuthority())||u.getPathSegments().size()!=1||u.getQuery()!=null||u.getFragment()!=null)throw new IOException("bad uri");String name=u.getLastPathSegment();if(name==null||!name.matches("[0-9a-fA-F-]{36}\\.(jpg|png|webp|json)"))throw new IOException("bad file");File d=directory(c).getCanonicalFile(),f=new File(d,name).getCanonicalFile();if(!d.equals(f.getParentFile()))throw new IOException("outside cache");return f;}
    static void clear(Context c){File[] files=directory(c).listFiles();if(files!=null)for(File f:files)f.delete();}
    static void prune(Context c){File[] files=directory(c).listFiles();if(files!=null)for(File f:files)if(f.lastModified()<System.currentTimeMillis()-3600000L)f.delete();}
    @Override public boolean onCreate(){return true;}
    @Override public String getType(Uri u){try{File f=file(getContext(),u);String n=f.getName();return n.endsWith(".jpg")?"image/jpeg":n.endsWith(".png")?"image/png":n.endsWith(".webp")?"image/webp":"application/json";}catch(IOException e){return null;}}
    @Override public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException {try{return ParcelFileDescriptor.open(file(getContext(),u),ParcelFileDescriptor.parseMode(mode));}catch(Exception e){throw new FileNotFoundException("Invalid photo URI");}}
    @Override public Cursor query(Uri u,String[] projection,String selection,String[] args,String sort){try{File f=file(getContext(),u);String[] cols=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor cursor=new MatrixCursor(cols);Object[] row=new Object[cols.length];for(int i=0;i<cols.length;i++)row[i]=OpenableColumns.DISPLAY_NAME.equals(cols[i])?f.getName():OpenableColumns.SIZE.equals(cols[i])?f.length():null;cursor.addRow(row);return cursor;}catch(IOException e){return null;}}
    @Override public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}
    @Override public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
    @Override public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}
}

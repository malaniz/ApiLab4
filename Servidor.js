const express = require('express');
const app = express();
const cors =require("cors");
const bodyParser = require('body-parser');
const MongoDb=require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/myproject';
const mongodb=require('mongodb');
const jwt=require('jsonwebtoken');
const expressjwt=require('express-jwt');
const secret="equilicua";


//app.use(bodyParser.urlencoded({extended:false}));
app.use(cors());
app.use(bodyParser.json());
app.use('/api/',expressjwt({secret:secret}));

let database=null ;
let permis={};
//una sola conexión// /api/collection/acción// /auth/
MongoDb.connect(url,(err,db)=>{
 	if(err)
		return console.log(err);
	database= db;
	actualizarPermisos();
});


let actualizarPermisos= ()=>{
database.collection('rol').find().toArray((error,data)=>{
	if(error){return console.log(error)}
	permis=data;
});
};
//Middleware
app.use('/api/:collection/:action',(req,res,next)=>{
	let token =req.header('Authorization').split(' ');
	let decoded = jwt.decode(token[1]);
	let rol=decoded.rol;
	let col=req.params.collection;
	let action=req.params.action;
	for(let roles in permis)
	{
		if(permis[roles].rol===rol)
		{
			console.log("entró a los permisos de :"+rol);
			for(let p in permis[roles].collections)
			{
				if(permis[roles].collections[p].collection===col)
				{
					console.log("Entró a la colección :"+ col+" \n la acción es "+action);
					if(permis[roles].collections[p][action])
							return next();
					else
						return res.json({error:true,message:'Acción invalida'});
				}
			}
		}
	}
	res.json({error:true,message:'colección no encontrada en la base de datos'});
});

app.use((err,req,res,next)=>{
	if(err.name==='UnauthorizedError')
		res.status(401).send({error:true,message:'Requiere logeo'});
});

//Login
app.post('/login',(req,res)=>{

	if(!('credentials' in req.body)){

		return res.status(401).json({error: true, trace: "bad request"});
	}
	console.log(req.body.credentials);
	database.collection('user').findOne(req.body.credentials,(err, result)=>{
		if(err)
			return res.json({error:true,message:err.message});
		if(!result)
		{
			res.json({error:true,message:'user invalido'});
			return;
		}
		let token= jwt.sign(result,secret,{expiresIn:60*4});
		res.json({data:{token:token,id:result._id,username:result.usuario,rol:result.rol}});
	});
});
//Listar
app.get('/api/:collection/list',(req,res)=>{

		if(req.params.collection === "*"){
			 database.listCollections({})
			    .toArray(function(err, items) {
						if(err) return res.json({error:true,message:err.message});
						res.json(items);
			})
		}
		else{
		let collection=database.collection(req.params.collection);


		collection.find({}).toArray((err,data)=>{
					console.log(data);
			if(err) return res.json({error:true,message:err.message});
			res.json(data);
		});
	}
});
//find
app.get('/api/:collection/find',(req,res)=>{
		let collection=database.collection(req.params.collection);
		collection.find(req.body).toArray((err,data)=>{
			if(err) return res.json({error:true,message:err.message});
			res.json(data);
		});
});
//Insertar
app.post('/api/:collection/insert',(req,res)=>{
	let collection=database.collection(req.params.collection);
	collection.insert(req.body,(err,resp)=>{
		if(err)
			res.json({error:true , message:err.message});
		else
			{
				res.json({error:false , message:'el id insertado es:' +resp.insertedIds});
				if(req.params.collection === 'rol')//Si se inserta un nuevo rol
				{
					actualizarPermisos();//se actualiza el arreglo de permisos en memoria
				}
			}
	});
});
//Borrar
app.get('/api/:collection/remove',(req,res)=>{
	if(req.query.id)
	{
		let idBorrar=req.query.id;
		let collection=database.collection(req.params.collection);
		collection.deleteOne({_id:new mongodb.ObjectID(idBorrar)},(err,result)=>{
			if(err)
				res.json({error:true, message: err.message});
			else if(result.result.n>0)
				res.json({error:false , message:'Borrado correctamente: '+idBorrar});
			else
				res.json({error:true , message:'No se pudo eliminar'})
		});
	}
	else
	{
		res.json({error:true , message:'No se ingresó un ID'});
	}
});
//Actualizar
app.post('/api/:collection/update',(req,res)=>{

	let idAct=req.query.id;

	if(idAct)
	{
		let collection=database.collection(req.params.collection);
		collection.updateOne({_id: new mongodb.ObjectID(idAct)},{$set: req.body},(error,resulta)=>{
			if(error)
			 res.json({error:true , message:error });
			else
				{
					res.json({error:false ,message: 'se ha actualizado correctamente'});
					if(req.params.collection==='rol')//es decir que se actualiza un rol
						actualizarPermisos();//se actualiza el arreglo de permisos en memoria
				}
				//retornar success true o error
			//res.send('Estamos en update y se actualizo el registro con id:'+ idAct);
		});
	}
});


app.listen(4444,'0.0.0.0',()=>console.log('server running http://localhost:4444'));
//req.body estoy en las variables que manda por post
//middleware funciones en el medio cuando pasa al req pasan transformado los datos
//req.query variables de get

const Patient = require('../models').Patient;
const User = require('../models').User;
const Doctor = require('../models').Doctor;
const create = async function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	const body = req.body;
	if (!body.patientId) {
		return ReE(res, 'ERROR0017', 400);
	}
	let duplicatePatient = await Patient.findOne({patientId: body.patientId});
	if (duplicatePatient) {
		return ReE(res, 'ERROR0018', 409);
	}
	let patient = new Patient({
		patientId: body.patientId,
		favoriteDoctors: body.favoriteDoctors,
		deletionFlag: body.deletionFlag
	});
	await  patient.save();
	return ReS(res, {message: 'Tạo thông tin bác sỹ thành công', patient: patient}, 200);
};

module.exports.create = create;

// admin get all patients to view
const getPatients = async function (req, res, next) {
	// get all patients nếu không có param truyền lên
	// get all patients nếu có param truyền lên ( chỉ dùng để get all patients chưa bị xóa logic)
	let query = {};
	if (req.query.deletionFlag) query.deletionFlag = req.query.deletionFlag;
	Patient.find(query, function (err, getPatient) {
		if (err) {
			if (err) return ReE(res, 'ERROR0016', 404);
			next();
		}
		return ReS(res, {message: 'Tải danh sách bệnh nhân thành công', getPatient: getPatient}, 200);
	});
};
module.exports.getPatients = getPatients;


// get patient to view
const getInformationPatientById = async function (req, res) {
	if (!req.params.patientId) {
		return ReE(res, 'ERROR0010', 400);
	}
	try {
		let query = {patientId: req.params.patientId};
		Patient.findOne(
			query
		)
			.select('favoriteDoctors -_id')
			.populate(
				{
					path: 'patientId',
					select: '-password -createdAt -updatedAt'
				}
			)
			.exec(function (err, informationPatient) {
				if (err) return ReE(res, 'ERROR0038', 503);
				return ReS(res, {
					message: 'Lấy thông tin bệnh nhân thành công',
					informationPatient: informationPatient
				}, 200);
			});
	} catch (e) {
		return ReE(res, 'ERROR0038', 503);
	}
};
module.exports.getInformationPatientById = getInformationPatientById;


const update = async function (req, res) {
	let data;
	data = req.body;
	if (!data) return ReE(res, 'ERROR0010', 400);
	try {
		Patient.findOne({patientId: data.patientId}, function (err, patientUpdate) {
			if (!patientUpdate) return ReE(res, 'ERROR0016', 404);
			if (err) return ReE(res, 'ERROR0029', 404);
			patientUpdate.set(data);

			patientUpdate.save(function (err, updatedPatients) {
				if (err) return ReE(res, 'ERROR0029', 503);
				res.send(updatedPatients);
				let objUser = User.findOne({id:data.patientId});
				if(!objUser){
					return ReE(res, 'Not found', 404);
				}
				objUser.set(data);
				objUser.save(function (err, updateUser) {
					if(err){
						return ReE(res, 'Update Failed', 503);
					}
					else {
						return ReE(res, 'Update Success', 200);
					}
				});
			});
		});
	} catch (e) {
		return ReE(res, 'ERROR0029', 503);
	}
};
module.exports.update = update;

const remove = async function (req, res) {
	const body = req.body;
	if (!body) return ReE(res, 'ERROR0010', 400);
	Patient.findByIdAndRemove(body.id, function (err, patient) {
		if (err) return ReE(res, 'ERROR0030', 404);
		return ReS(res, {message: 'Delete success'}, 200);
	});
};

module.exports.remove = remove;

const getListFavoriteDoctor = async function (req, res) {
	let s = 0;
	let p = 0;
	if(req.query.start && req.query.end){
		s = parseInt(req.query.start);
		p = parseInt(req.query.end);
	}
	const patientId = req.params.patientId;
	try {
		let patient = await Patient.find({
			patientId: patientId
		});
		if (patient.length === 0) {
			ReE(res, 'Bệnh nhân không tồn tại');
		}
		const favoriteDoctors = patient[0].favoriteDoctors;
		let doctors = await Doctor.find({})
			.select('currentRating idSpecialist.name -_id')
			.sort([['currentRating', 'descending']])
			.populate({
				path: 'doctorId',
				select: 'firstName middleName lastName avatar'
			});
		let results = [];
		for (let doctor of doctors) {
			const temp = favoriteDoctors.filter(obj => obj === (doctor.doctorId._id + ''));
			let itemInfoDoctor = {
				doctorId: doctor.doctorId._id,
				firstName: doctor.doctorId.firstName,
				middleName: doctor.doctorId.middleName,
				lastName: doctor.doctorId.lastName,
				avatar: doctor.doctorId.avatar,
				currentRating: doctor.currentRating,
				specialist: doctor.idSpecialist[0].name
			};
			if (temp && temp.length > 0) {
				results.push(itemInfoDoctor);
			}
		}
		if(req.query.start && req.query.end){
			return ReS(res, {message: 'Tạo danh sách bác sỹ được yêu thích thành công', listFavoriteDoctor: results.slice(s,p)}, 200);
		}
		else {
			return ReS(res, {message: 'Tạo danh sách bác sỹ được yêu thích thành công', listFavoriteDoctor: results}, 200);
		}

	} catch (e) {
		ReE(res, 'Không thể lấy được data');
	}
};
module.exports.getListFavoriteDoctor = getListFavoriteDoctor;

const getListIDFavoriteDoctor = async function (req, res) {
	if (!req.params.patientId) return ReE(res, 'ERROR0031', 404);
	try {
		Patient.findOne({patientId: req.params.patientId}, function (err, listIDFavoriteDoctor) {
			if (err) TE(err);
			return ReS(res, {
				message: 'Tạo danh sách bác sỹ được yêu thích thành công',
				listIDFavoriteDoctor: listIDFavoriteDoctor.favoriteDoctors
			}, 200);
		});
	} catch (e) {
		return ReE(res, 'ERROR0031', 404);
	}
};
module.exports.getListIDFavoriteDoctor = getListIDFavoriteDoctor;

const addFavoriteDoctor = async function (req, res) {
	let data = req.body;
	if (!data.patientId || !data.doctorId) return ReE(res, 'ERROR0010', 400);
	try {
		let objPatient = await Patient.findOne({patientId: data.patientId});
		if (!objPatient) return ReE(res, 'ERROR0032', 404);
		objPatient.favoriteDoctors.push(data.doctorId);
		await objPatient.save(function (err, objPatientUpdate) {
			if (err) return ReE(res, 'ERROR0032', 503);
			return ReS(res, {
				message: 'Thêm bác sỹ yêu thích thành công',
				objPatientUpdate: objPatientUpdate.favoriteDoctors
			}, 200);
		});
	} catch (e) {
		return ReE(res, 'ERROR0032', 503);
	}
};
module.exports.addFavoriteDoctor = addFavoriteDoctor;

const removeFavoriteDoctor = async function (req, res) {
	let data = req.body;

	if (!data.patientId || !data.doctorId) return ReE(res, 'ERROR0010', 400);
	try {
		let objPatient = await Patient.findOne({patientId: data.patientId});
		if (!objPatient) return ReE(res, 'ERROR0033', 404);
		objPatient.favoriteDoctors.pull(data.doctorId);
		await objPatient.save(function (err, objPatientUpdate) {
			if (err) return ReE(res, 'ERROR0033', 503);
			return ReS(res, {
				message: 'Xóa bác sỹ yêu thích thành công',
				objPatientUpdate: objPatientUpdate.favoriteDoctors
			}, 200);
		});
	} catch (e) {
		return ReE(res, 'ERROR0033', 503);
	}
};
module.exports.removeFavoriteDoctor = removeFavoriteDoctor;
